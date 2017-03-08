from subprocess import Popen, PIPE


def missing_system_dependencies(commands):
    missing = []
    for dependency in commands:
        result = Popen(['which', dependency], stdout=PIPE, stdin=PIPE, stderr=PIPE).communicate()[0]
        if not result:
            missing.append(dependency)
    return missing
