from django.contrib import admin

from .models import Camera, Lens, Library, LibraryUser, LibraryPath, Photo, PhotoFile, PhotoTag, Tag


class VersionedAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Created/Updated', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )
    readonly_fields = ['created_at', 'updated_at']


class LibraryUserInline(admin.TabularInline):
    model = LibraryUser
    exclude = ['created_at', 'updated_at']


class LibraryPathInline(admin.TabularInline):
    model = LibraryPath
    exclude = ['created_at', 'updated_at']


class LibraryAdmin(VersionedAdmin):
    list_display = ('name', 'classification_color_enabled', 'classification_location_enabled', 'classification_style_enabled', 'classification_object_enabled', 'classification_face_enabled', 'setup_stage_completed', 'created_at', 'updated_at')
    list_ordering = ('name',)
    list_filter = ('classification_color_enabled', 'classification_location_enabled', 'classification_style_enabled', 'classification_object_enabled', 'classification_face_enabled' ,'setup_stage_completed',)
    inlines = [LibraryUserInline, LibraryPathInline]

    fieldsets = (
        (None, {
            'fields': ('name', 'classification_color_enabled', 'classification_location_enabled', 'classification_style_enabled', 'classification_object_enabled', 'classification_face_enabled','setup_stage_completed'),
        }),
    ) + VersionedAdmin.fieldsets


class CameraAdmin(VersionedAdmin):
    list_display = ('id', 'library', 'make', 'model', 'earliest_photo', 'latest_photo')
    list_ordering = ('make', 'model')
    search_fields = ('id', 'library__id', 'make', 'model')

    fieldsets = (
        (None, {
            'fields': ('library', 'make', 'model', 'earliest_photo', 'latest_photo'),
        }),
    ) + VersionedAdmin.fieldsets
    readonly_fields = ['earliest_photo', 'latest_photo']


class LensAdmin(VersionedAdmin):
    list_display = ('id', 'library', 'name', 'earliest_photo', 'latest_photo')
    list_ordering = ('make', 'model')
    search_fields = ('id', 'library__id', 'name')

    fieldsets = (
        (None, {
            'fields': ('library', 'name', 'earliest_photo', 'latest_photo'),
        }),
    ) + VersionedAdmin.fieldsets
    readonly_fields = ['earliest_photo', 'latest_photo']


class PhotoFileInline(admin.TabularInline):
    model = PhotoFile
    exclude = ['created_at', 'updated_at',]
    readonly_fields = ['file_modified_at',]


class PhotoTagInline(admin.TabularInline):
    model = PhotoTag
    exclude = ['created_at', 'updated_at',]


class PhotoAdmin(VersionedAdmin):
    list_display = ('id', 'library', 'visible', 'taken_at', 'taken_by')
    list_ordering = ('taken_at',)
    search_fields = ('id', 'library__id')
    inlines = [PhotoFileInline, PhotoTagInline]

    fieldsets = (
        (None, {
            'fields': ('library', 'visible', 'taken_at', 'taken_by', 'aperture', 'exposure', 'iso_speed', 'focal_length', 'flash', 'metering_mode', 'drive_mode', 'shooting_mode', 'camera', 'lens', 'latitude', 'longitude', 'altitude'),
        }),
    ) + VersionedAdmin.fieldsets


class TagAdmin(VersionedAdmin):
    list_display = ('id', 'name', 'library', 'parent', 'type', 'source')
    list_ordering = ('name',)
    list_filter = ('type', 'source')
    search_fields = ('id', 'name', 'library__id')

    fieldsets = (
        (None, {
            'fields': ('library', 'name', 'parent', 'type', 'source'),
        }),
    ) + VersionedAdmin.fieldsets


admin.site.register(Library, LibraryAdmin)
admin.site.register(Camera, CameraAdmin)
admin.site.register(Lens, LensAdmin)
admin.site.register(Photo, PhotoAdmin)
admin.site.register(Tag, TagAdmin)
