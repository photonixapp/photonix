from client_data_synchronizer import ClientDataSynchronizer


def test_init_data():
    cds = ClientDataSynchronizer()
    assert len(cds.committed_data) == 1
    assert cds.committed_data[0]['seq_num'] == 1
    assert 'search_results' in cds.committed_data[0]['data']


def test_adding_search_results():
    cds = ClientDataSynchronizer()
    # Add a search result
    cds.add_search_results(query='tags=cat', results=[{'id': 1, 'thumbnail': 'test1.jpg'}])
    assert isinstance(cds.staged_data, dict)
    assert 'search_results' in cds.staged_data
    assert len(cds.staged_data['search_results']) == 1
    assert 'tags=cat' in cds.staged_data['search_results']
    assert cds.staged_data['search_results']['tags=cat'] == [{'id': 1, 'thumbnail': 'test1.jpg'}]
    # Add a second one and they should both be there
    cds.add_search_results(query='tags=dog', results=[{'id': 2, 'thumbnail': 'test2.jpg'}])
    assert isinstance(cds.staged_data, dict)
    assert 'search_results' in cds.staged_data
    assert len(cds.staged_data['search_results']) == 2
    assert 'tags=dog' in cds.staged_data['search_results']
    assert cds.staged_data['search_results']['tags=dog'] == [{'id': 2, 'thumbnail': 'test2.jpg'}]


def test_committing():
    cds = ClientDataSynchronizer()
    cds.add_search_results(query='tags=cat', results=[{'id': 1, 'thumbnail': 'test1.jpg'}])
    cds.add_search_results(query='tags=dog', results=[{'id': 2, 'thumbnail': 'test2.jpg'}])
    assert len(cds.committed_data) == 1
    assert 'search_results' in cds.staged_data
    assert 'data' in cds.committed_data[0]
    assert cds.committed_data[0]['seq_num'] == 1
    cds.commit()
    # Staged data should have moved to committed and seq_num incremented
    assert len(cds.committed_data) == 2
    assert 'search_results' not in cds.staged_data
    assert cds.committed_data[1]['seq_num'] == 2
    assert len(cds.committed_data[1]['data']['search_results']) == 2


def test_serializing():
    cds = ClientDataSynchronizer()
    response = cds.serialize({'thumbnail': 'test1.jpg', 'id': 1})
    # JSON with keys sorted
    assert response == '{"id": 1, "thumbnail": "test1.jpg"}'


def test_diffing():
    # Check diff format between two strings is correct and diff can be merged into the first string
    cds = ClientDataSynchronizer()
    first = 'The brown fox jumps'
    second = 'The quick brown fox'
    diff = cds.diff_string(first, second)
    assert diff == '<3,3> quick<13,19>'
    merged = cds.diff_string_merge(first, diff)
    assert merged == second

    # Same as above but more complex example using serialized dicts
    first = {
        'search_results': {
            'tags=cat': [
                {'id': 1, 'thumbnail': 'cat1.jpg'},
                {'id': 2, 'thumbnail': 'cat2.jpg'},
                {'id': 3, 'thumbnail': 'cat2.jpg'},
            ],
        },
        'photo_details': {
            '1': {'Title': 'My Cat'},
        },
    }
    second = {
        'search_results': {
            'tags=cat': [
                {'id': 1, 'thumbnail': 'cat1.jpg'},
                {'id': 2, 'thumbnail': 'cat2.jpg'},
                {'id': 3, 'thumbnail': 'cat2.jpg'},
            ],
            'tags=dog': [
                {'id': 4, 'thumbnail': 'dog1.jpg'},
                {'id': 5, 'thumbnail': 'dog2.jpg'},
            ],
        },
        'photo_details': {
            '1': {'Title': 'My Cat'},
            '4': {'Title': 'My Dog'},
        },
    }
    first = cds.serialize(first)
    second = cds.serialize(second)
    diff = cds.diff_string(first, second)
    assert diff == '<43,43>, "4": {"Title": "My Dog"}<185,187>, "tags=dog": [{"id": 4, "thumbnail": "dog1.jpg"}, {"id": 5, "thumbnail": "dog2.jpg"}]}}<187,187>'
    merged = cds.diff_string_merge(first, diff)
    assert merged == second


def test_commit_and_diff():
    cds = ClientDataSynchronizer()
    diff = cds.calculate_diff()
    # Diff of initial commit
    assert diff == {'diff': '<0,0>{"photo_details": <2,2>, "search_results": {}}<2,2>', 'seq_num': 1}
    merged = cds.diff_string_merge('{}', diff['diff'])
    assert merged == '{"photo_details": {}, "search_results": {}}'
    assert cds.pushed_data == {'search_results': {}, 'photo_details': {}}
    cds.client_acknowlages_commits(diff['seq_num'])
    assert cds.pushed_seq_num == 1
    # Add search result
    cds.add_search_results(query='tags=cat', results=[{'id': 1, 'thumbnail': 'test1.jpg'}])
    assert cds.committed_data == []
    assert cds.staged_data == {'search_results': {'tags=cat': [{'thumbnail': 'test1.jpg', 'id': 1}]}}
    diff = cds.calculate_diff()
    assert diff is None
    # Commit
    cds.commit()
    assert cds.committed_data == [{'seq_num': 2, 'data': {'search_results': {'tags=cat': [{'id': 1, 'thumbnail': 'test1.jpg'}]}}}]
    assert cds.staged_data == {}
    diff = cds.calculate_diff()
    # Check diff and sequence number
    assert diff == {'diff': '<41,41>"tags=cat": [{"id": 1, "thumbnail": "test1.jpg"}]<43,43>', 'seq_num': 2}
    merged = cds.diff_string_merge(merged, diff['diff'])
    assert merged == '{"photo_details": {}, "search_results": {"tags=cat": [{"id": 1, "thumbnail": "test1.jpg"}]}}'


if __name__ == '__main__':
    test_init_data()
    test_adding_search_results()
    test_committing()
    test_serializing()
    test_diffing()
    test_commit_and_diff()