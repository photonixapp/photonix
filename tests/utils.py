import json


# These util functions come from the Saleor project and are licensed as BSD-3-Clause
# https://github.com/mirumee/saleor/blob/master/tests/api/utils.py

def _get_graphql_content_from_response(response):
    return json.loads(response.content.decode("utf8"))


def get_graphql_content(response):
    """Get's GraphQL content from the response, and optionally checks if it
    contains any operating-related errors, eg. schema errors or lack of
    permissions.
    """
    content = _get_graphql_content_from_response(response)
    assert "errors" not in content, content["errors"]
    return content
