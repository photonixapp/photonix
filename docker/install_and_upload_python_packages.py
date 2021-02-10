import argparse
import os
import subprocess


os.environ['PYTHONUNBUFFERED'] = '1'


def install_and_upload(username=None, password=None):
    # A lot of packages don't have pre-compiled binaries for other
    # architectures which makes installation take a long time. Installing via
    # this script uploads built .whl packages to a private PyPI server so
    # they're cached for next time.

    cmd = ['/usr/local/bin/pip', 'install', '-r', '/srv/requirements.txt']
    env = dict(os.environ)  # Need to pass all envvars down to subprocesses or we get compilation errors for C extensions
    env['PYTHONUNBUFFERED'] = '1'  # Without this we don't get real-time output from Python-based subprocesses
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)

    for line in proc.stdout:
        line = line.rstrip().decode('utf-8')
        print(line)

        if username and password and 'Created wheel' in line:
            whl_name = None
            for install_line in line.split('\n'):
                if 'Created wheel for' in install_line:
                    whl_name = install_line.split('filename=')[1].split(' ')[0]
                if 'Stored in directory' in install_line:
                    folder = install_line.split('Stored in directory:')[1].strip()
                    child = Popen(['pypiupload', 'files', f'{folder}/{whl_name}', '-i', 'epix', '-u', username, '-p', password], stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
                    for child_line in child.stdout:
                        child_line = child_line.rstrip().decode('utf-8')
                        print(child_line)
                    if child.wait() != 0:
                        exit(1)
                    print()

    if proc.wait() != 0:
        exit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('-u', '--username', help='Custom PyPI server username')
    parser.add_argument('-p', '--password', help='Custom PyPI server password')
    args = parser.parse_args()

    install_and_upload(username=args.username, password=args.password)
