from copy import deepcopy
from difflib import SequenceMatcher
import json
import os
import re

import redis
from redis_lock import Lock

from config.managers import synchronizer_state


r = redis.Redis(host=os.environ.get('REDIS_HOST', '127.0.0.1'))


class ClientDataSynchronizer():
    def __init__(self, backend='dummy', clear=False):
        self.backend = backend
        self.staged_data = {}

        if backend == 'dummy':
            self._pushed_data = {}
            self._committed_data = []
            self._pushed_seq_num = 0
            self._committed_seq_num = 0

        elif backend == 'redis':
            self.redis_manager = synchronizer_state
            if clear:
                self.redis_manager.clear('pushed_data')
                self.redis_manager.clear('committed_data')
                self.redis_manager.clear('pushed_seq_num')
                self.redis_manager.clear('committed_seq_num')

        self.add_default_data()
        self.commit()

    def get_pushed_data(self):
        if self.backend == 'dummy':
            return deepcopy(self._pushed_data)
        elif self.backend == 'redis':
            return self.redis_manager.get('pushed_data')

    def set_pushed_data(self, data):
        if self.backend == 'dummy':
            self._pushed_data = data
        elif self.backend == 'redis':
            self.redis_manager.set('pushed_data', data)

    def get_pushed_seq_num(self):
        if self.backend == 'dummy':
            return self._pushed_seq_num
        elif self.backend == 'redis':
            return self.redis_manager.get('pushed_seq_num')

    def set_pushed_seq_num(self, num):
        if self.backend == 'dummy':
            self._pushed_seq_num = num
        elif self.backend == 'redis':
            self.redis_manager.set('pushed_seq_num', num)

    def get_committed_data(self):
        if self.backend == 'dummy':
            return deepcopy(self._committed_data)
        elif self.backend == 'redis':
            data = self.redis_manager.get('committed_data')
            return data

    def set_committed_data(self, data):
        if self.backend == 'dummy':
            self._committed_data = data
        elif self.backend == 'redis':
            self.redis_manager.set('committed_data', data)

    def get_committed_seq_num(self):
        if self.backend == 'dummy':
            return self._committed_seq_num
        elif self.backend == 'redis':
            return self.redis_manager.get('committed_seq_num')

    def set_committed_seq_num(self, num):
        if self.backend == 'dummy':
            self._committed_seq_num = num
        elif self.backend == 'redis':
            self.redis_manager.set('committed_seq_num', num)

    def add_default_data(self):
        if 'search_results' not in self.staged_data:
            self.staged_data['search_results'] = {}
        if 'photo_details' not in self.staged_data:
            self.staged_data['photo_details'] = {}

    def commit(self):
        with Lock(r, 'client_data_syncronizer'):  # TODO: Lock name should really include user/session ID so it's not a global lock
            committed_data = self.get_committed_data()
            committed_seq_num = self.get_committed_seq_num()
            committed_seq_num += 1
            committed_data.append({
                'seq_num':  committed_seq_num,
                'data':     deepcopy(self.staged_data),
            })
            self.set_committed_data(committed_data)
            self.set_committed_seq_num(committed_seq_num)
            self.staged_data = {}

    def serialize(self, data):
        return json.dumps(data, sort_keys=True)

    def push(self):
        pass

    def calculate_diff(self):
        '''
        Works out what's new from pushed_data to all the committed_data
        '''
        first = self.serialize(self.get_pushed_data())
        try:
            commit = self.get_committed_data()[-1]
        except IndexError:
            return None

        second = self.get_pushed_data()
        for key, val in commit['data'].items():
            second[key] = val

        second = self.serialize(second)
        diff = self.diff_string(first, second)

        return {
            'seq_num':  commit['seq_num'],
            'diff':     diff,
        }

    def diff_string(self, first, second):
        '''
        Returns diff of two strings in the following format
        <FIRST_STRING_START_POSITION,FIRST_STRING_FINISH_POSITION>REPLACEMENT_STRING...
        '''
        sm = SequenceMatcher(None, first, second)
        diff_list = []
        prev_a = 0
        prev_b = 0
        prev_size = 0

        for match in sm.get_matching_blocks():
            if match.a > match.b:
                diff_list.append('<{},{}>'.format(prev_a, match.size))
            elif match.b > match.a:
                diff_list.append('<{},{}>{}'.format(prev_a + prev_size, match.a, second[prev_b + prev_size:match.b]))
            elif match.a == match.b and match.a != 0:
                diff_list.append('<{},{}>'.format(prev_a + prev_size, match.a, second[prev_b + prev_size:match.b]))
            prev_a = match.a
            prev_b = match.b
            prev_size = match.size

        if prev_a + prev_size < prev_b:
            last_diff = '<{},{}>'.format(prev_a + match.size, len(first))
            if last_diff != diff_list[-1]:
                diff_list.append(last_diff)

        return ''.join(diff_list)

    def diff_string_merge(self, first, diff):
        '''
        Merges a string with a diff in the format that diff_string() produces
        '''
        result_list = []
        prev_marker = 0
        matches = re.findall(r'(\<(\d+),(\d+)\>([^\<]*))', diff)

        for match in matches:
            result_list.append(first[prev_marker:int(match[1])])
            result_list.append(match[3])
            prev_marker = int(match[2])

        return ''.join(result_list)

    def client_acknowlages_commits(self, sequence_number):
        '''
        Updates pushed_data, pushed_seq_num and clears out old committed_data
        '''
        with Lock(r, 'client_data_syncronizer'):
            committed_data = self.get_committed_data()

            for i, item in enumerate(self.get_committed_data()):
                if sequence_number < item['seq_num']:
                    break

                pushed_data = deepcopy(self.get_pushed_data())
                for key, val in item['data'].items():
                    pushed_data[key] = val

                self.set_pushed_data(pushed_data)
                self.set_pushed_seq_num(item['seq_num'])

                del committed_data[i]

            self.set_committed_data(committed_data)

    def add_search_results(self, query, results):
        if 'search_results' not in self.staged_data:
            self.staged_data['search_results'] = {}
        self.staged_data['search_results'][query] = results
        # TODO: Remove older search results when list gets too large
