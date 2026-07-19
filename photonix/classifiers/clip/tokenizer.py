"""Pure-Python CLIP BPE tokenizer.

Adapted from OpenAI's CLIP `simple_tokenizer`
(https://github.com/openai/CLIP/blob/main/clip/simple_tokenizer.py),
which is released under the MIT License:

    Copyright (c) 2021 OpenAI

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the above copyright notice
    being included in all copies or substantial portions of the Software.

This is a self-contained port that builds the byte-pair-encoding merges from
the ``vocab.json`` + ``merges.txt`` shipped with the model, so it has no
dependency on the ``clip`` package itself. It relies on the third-party
``regex`` module for the ``\\p{L}`` / ``\\p{N}`` Unicode classes the real CLIP
token pattern uses (the stdlib ``re`` module cannot express these).
"""
import html
import json
from functools import lru_cache

import numpy as np
import regex as re


# The exact tokenisation pattern used by OpenAI CLIP. It needs \p{L}/\p{N}
# which only the `regex` module provides, so this file must not fall back to
# the stdlib `re` module.
PAT = re.compile(
    r"""<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|[\p{L}]+|[\p{N}]|[^\s\p{L}\p{N}]+""",
    re.IGNORECASE,
)


@lru_cache()
def bytes_to_unicode():
    """Reversible map from utf-8 bytes to unicode strings (as CLIP uses)."""
    bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('\xa1'), ord('\xac') + 1)) \
        + list(range(ord('\xae'), ord('\xff') + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    return dict(zip(bs, [chr(c) for c in cs]))


class ClipTokenizer:
    def __init__(self, vocab_path, merges_path, context_length=77):
        with open(vocab_path) as f:
            self.encoder = json.load(f)
        with open(merges_path) as f:
            merges = f.read().split('\n')
        merges = [tuple(m.split()) for m in merges if m and len(m.split()) == 2]
        self.bpe_ranks = dict(zip(merges, range(len(merges))))
        self.byte_encoder = bytes_to_unicode()
        self.context_length = context_length
        self.sot = self.encoder['<|startoftext|>']
        self.eot = self.encoder['<|endoftext|>']
        self.cache = {}

    def bpe(self, token):
        if token in self.cache:
            return self.cache[token]
        word = tuple(token[:-1]) + (token[-1] + '</w>',)
        pairs = set(zip(word[:-1], word[1:]))
        if not pairs:
            return token + '</w>'
        while True:
            bigram = min(pairs, key=lambda p: self.bpe_ranks.get(p, float('inf')))
            if bigram not in self.bpe_ranks:
                break
            first, second = bigram
            new_word = []
            i = 0
            while i < len(word):
                try:
                    j = word.index(first, i)
                except ValueError:
                    new_word.extend(word[i:])
                    break
                new_word.extend(word[i:j])
                i = j
                if word[i] == first and i < len(word) - 1 and word[i + 1] == second:
                    new_word.append(first + second)
                    i += 2
                else:
                    new_word.append(word[i])
                    i += 1
            word = tuple(new_word)
            if len(word) == 1:
                break
            pairs = set(zip(word[:-1], word[1:]))
        result = ' '.join(word)
        self.cache[token] = result
        return result

    def encode(self, text):
        """Tokenise `text` into a padded [1, context_length] int32 array of ids."""
        text = html.unescape(html.unescape(text)).strip().lower()
        tokens = []
        for token in re.findall(PAT, text):
            token = ''.join(self.byte_encoder[b] for b in token.encode('utf-8'))
            tokens.extend(self.encoder[t] for t in self.bpe(token).split(' '))
        ids = [self.sot] + tokens[:self.context_length - 2] + [self.eot]
        ids = ids + [0] * (self.context_length - len(ids))
        return np.array([ids], dtype=np.int32)
