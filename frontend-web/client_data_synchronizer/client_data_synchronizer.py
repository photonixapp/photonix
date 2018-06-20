from copy import deepcopy
from difflib import SequenceMatcher
import json
import re


class ClientDataSynchronizer():
    def __init__(self):
        self.pushed_data = {}
        self.committed_data = []
        self.staged_data = {}

        self.pushed_seq_num = 0
        self.committed_seq_num = 0

        self.add_default_data()
        self.commit()

    def add_default_data(self):
        if 'search_results' not in self.staged_data:
            self.staged_data['search_results'] = {}
        if 'photo_details' not in self.staged_data:
            self.staged_data['photo_details'] = {}

    def commit(self):
        self.committed_data.append({
            'seq_num':  self.committed_seq_num + 1,
            'data':     deepcopy(self.staged_data),
        })
        self.committed_seq_num += 1
        self.staged_data = {}

    def serialize(self, data):
        return json.dumps(data, sort_keys=True)

    def push(self):
        pass

    def calculate_diff(self):
        '''
        Works out what's new from pushed_data to all the committed_data
        '''
        first = self.serialize(self.pushed_data)
        try:
            commit = self.committed_data[-1]
        except IndexError:
            return None

        second = self.pushed_data
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
        for i, item in enumerate(self.committed_data):
            if sequence_number < item['seq_num']:
                break
            for key, val in item['data'].items():
                self.pushed_data[key] = val
            self.pushed_seq_num = sequence_number
            del self.committed_data[i]

    def add_search_results(self, query, results):
        if 'search_results' not in self.staged_data:
            self.staged_data['search_results'] = {}
        self.staged_data['search_results'][query] = results
        # TODO: Remove older search results when list gets too large
