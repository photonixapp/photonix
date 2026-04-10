# -*- coding: utf-8 -*-
# Manually written to use the stable descriptor_pool/builder API which works
# across protobuf 4.x-7.x without version-pinning. To regenerate from the
# .proto source (pins to a specific protobuf major version):
#   python -m grpc_tools.protoc --python_out=. --proto_path=. string_int_label_map.proto
# source: string_int_label_map.proto
"""Generated protocol buffer code."""
from google.protobuf.internal import builder as _builder
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import symbol_database as _symbol_database

_sym_db = _symbol_database.Default()

DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(
    b'\n\x1astring_int_label_map.proto\x12\x17object_detection.protos\"G\n\x15StringIntLabelMapItem\x12\x0c\n\x04name\x18\x01 \x01(\t\x12\n\n\x02id\x18\x02 \x01(\x05\x12\x14\n\x0c\x64isplay_name\x18\x03 \x01(\t\"Q\n\x11StringIntLabelMap\x12<\n\x04item\x18\x01 \x03(\x0b\x32..object_detection.protos.StringIntLabelMapItem'
)

_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, globals())
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'string_int_label_map_pb2', globals())
if hasattr(_descriptor, '_USE_C_DESCRIPTORS') and not _descriptor._USE_C_DESCRIPTORS:
    DESCRIPTOR._loaded_options = None
# @@protoc_insertion_point(module_scope)
