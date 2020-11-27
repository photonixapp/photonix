import os
import subprocess


os.environ['PYTHONUNBUFFERED'] = '1'


def install_and_upload():
    # A lot of packages don't have pre-compiled binaries for other
    # architectures which makes installation take a long time. Installing via
    # this script uploads built .whl packages to a private PyPI server so
    # they're cached for next time.

    cmd = ['/usr/local/bin/pip', 'install', '-r', '/srv/requirements.txt']
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env={'PYTHONUNBUFFERED': '1'})
    for line in proc.stdout:
        line = line.rstrip().decode("utf-8")
        print(line)

        if 'Created wheel' in line:
            whl_name = None
            for install_line in line.split('\n'):
                if 'Created wheel for' in install_line:
                    whl_name = install_line.split('filename=')[1].split(' ')[0]
                if 'Stored in directory' in install_line:
                    folder = install_line.split('Stored in directory:')[1].strip()
                    child = Popen(['pypiupload', 'files', f'{folder}/{whl_name}', '-i', 'epix'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, env={'PYTHONUNBUFFERED': '1'})
                    for child_line in child.stdout:
                        child_line = child_line.rstrip().decode("utf-8")
                        print(child_line)
                    if child.wait() != 0:
                        exit(1)
                    print()

    if proc.wait() != 0:
        exit(1)

if __name__ == '__main__':
    install_and_upload()
