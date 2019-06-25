from sqlalchemy import Boolean, CHAR, CheckConstraint, Column, DECIMAL, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()
metadata = Base.metadata


class Camera(Base):
    __tablename__ = 'photos_camera'
    __table_args__ = (
        Index('photos_camera_make_model_7e783a69_uniq', 'make', 'model', unique=True),
    )

    id = Column(CHAR(32).with_variant(UUID, 'postgresql'), primary_key=True)
    updated_at = Column(DateTime, nullable=False)
    make = Column(String(128), nullable=False)
    model = Column(String(128), nullable=False)
    earliest_photo = Column(DateTime, nullable=False)
    latest_photo = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, index=True)


class Lens(Base):
    __tablename__ = 'photos_lens'

    id = Column(CHAR(32).with_variant(UUID, 'postgresql'), primary_key=True)
    updated_at = Column(DateTime, nullable=False)
    name = Column(String(128), nullable=False)
    earliest_photo = Column(DateTime, nullable=False)
    latest_photo = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, index=True)


class Tag(Base):
    __tablename__ = 'photos_tag'
    __table_args__ = (
        Index('photos_tag_name_type_source_2354b52a_uniq', 'name', 'type', 'source', unique=True),
    )

    id = Column(CHAR(32).with_variant(UUID, 'postgresql'), primary_key=True)
    updated_at = Column(DateTime, nullable=False)
    name = Column(String(128), nullable=False)
    type = Column(String(1))
    source = Column(String(1), nullable=False)
    created_at = Column(DateTime, nullable=False, index=True)
    parent_id = Column(ForeignKey('photos_tag.id'), index=True)

    parent = relationship('Tag', remote_side=[id])


class Photo(Base):
    __tablename__ = 'photos_photo'

    id = Column(CHAR(32).with_variant(UUID, 'postgresql'), primary_key=True)
    updated_at = Column(DateTime, nullable=False)
    taken_at = Column(DateTime)
    taken_by = Column(String(128))
    aperture = Column(DECIMAL)
    exposure = Column(String(8))
    iso_speed = Column(Integer)
    focal_length = Column(DECIMAL)
    flash = Column(Boolean)
    metering_mode = Column(String(32))
    drive_mode = Column(String(32))
    shooting_mode = Column(String(32))
    latitude = Column(DECIMAL)
    longitude = Column(DECIMAL)
    altitude = Column(DECIMAL)
    camera_id = Column(ForeignKey('photos_camera.id'), index=True)
    lens_id = Column(ForeignKey('photos_lens.id'), index=True)
    visible = Column(Boolean, nullable=False)
    created_at = Column(DateTime, nullable=False, index=True)

    camera = relationship('Camera')
    lens = relationship('Lens')


class PhotoFile(Base):
    __tablename__ = 'photos_photofile'

    id = Column(CHAR(32).with_variant(UUID, 'postgresql'), primary_key=True)
    created_at = Column(DateTime, nullable=False, index=True)
    updated_at = Column(DateTime, nullable=False)
    path = Column(String(512), nullable=False)
    height = Column(Integer)
    mimetype = Column(String(32))
    file_modified_at = Column(DateTime, nullable=False)
    bytes = Column(Integer, nullable=False)
    preferred = Column(Boolean, nullable=False)
    photo_id = Column(ForeignKey('photos_photo.id'), nullable=False, index=True)
    raw_external_params = Column(String(16))
    raw_external_version = Column(String(16))
    raw_processed = Column(Boolean, nullable=False)
    raw_version = Column(Integer)
    width = Column(Integer)

    photo = relationship('Photo')


class Phototag(Base):
    __tablename__ = 'photos_phototag'

    id = Column(CHAR(32).with_variant(UUID, 'postgresql'), primary_key=True)
    updated_at = Column(DateTime, nullable=False)
    source = Column(String(1), nullable=False)
    model_version = Column(Integer)
    confidence = Column(Float, nullable=False)
    significance = Column(Float)
    verified = Column(Boolean, nullable=False)
    hidden = Column(Boolean, nullable=False)
    position_x = Column(Float)
    position_y = Column(Float)
    size_x = Column(Float)
    size_y = Column(Float)
    photo_id = Column(ForeignKey('photos_photo.id'), nullable=False, index=True)
    tag_id = Column(ForeignKey('photos_tag.id'), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, index=True)

    photo = relationship('Photo')
    tag = relationship('Tag')
