global_settings = {
    'version':                      0,
    'photo_dirs':                   [],
    'cache_dir':                    '/tmp/photo-manager',
}

user_settings = {
    'filter_date_start':            None,
    'filter_date_finish':           None,
}

global_state = {
    'photo_import_tasks_running':       0,
    'photo_import_task_queue':          [],
    'photo_thumbnailer_tasks_running':  0,
    'photo_thumbnailer_task_queue':     [],

    'photos_importing_pid':         None,
    'photos_importing_progress':    0.0,
    'photo_dirs_watching':          False,
    'photo_dirs_watching_pid':      None,
    'photo_dirs_scanning':          False,
    'photo_dirs_scanning_pid':      None,
    'photo_dirs_scanning_progress': 0.0,
    'world_loading':                False,
    'world_loading_pid':            None,
    'world_loading_progress':       0.0,
    'cities_loading':               False,
    'cities_loading_pid':           None,
    'cities_loading_progress':      0.0,
}

session_state = {}

initial_data = {
    'global_settings':  global_settings,
    'user_settings':    user_settings,
    'global_state':     global_state,
    'session_state':     session_state,
}
