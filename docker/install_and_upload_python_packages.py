import argparse
import os
import re
import subprocess


os.environ['PYTHONUNBUFFERED'] = '1'


class LineProcessor:
    whl_name = None
    folder = None

    def __init__(self, username, password, env):
        self.username = username
        self.password = password
        self.env = env

    def process_line(self, line):
        if self.username and self.password:
            if 'Created wheel for' in line:
                self.whl_name = line.split('filename=')[1].split(' ')[0]
            if 'Stored in directory' in line:
                self.folder = line.split('Stored in directory:')[1].strip()
                child = subprocess.Popen(['pypiupload', 'files', f'{self.folder}/{self.whl_name}', '-i', 'epix', '-u', self.username, '-p', self.password], stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=self.env)
                for child_line in child.stdout:
                    child_line = child_line.rstrip().decode('utf-8')
                    print(child_line)
                if child.wait() != 0:
                    exit(1)
                print()


def install_and_upload(username=None, password=None):
    # A lot of packages don't have pre-compiled binaries for architectures
    # other than amd64 which makes installation take a long time. Installing
    # via this script uploads built .whl packages to a private PyPI server so
    # they're cached online for next time.

    for dependency in open('/srv/requirements.txt').readlines():
        # Why loop through requirements.txt and install one-by-one rather than
        # pip install -r requirements.txt? h5py and matplotlib get compiled
        # against wrong versions of numpy if we don't.
        dependency = dependency.strip()

        # Pip doesn't seem to want to use our amd64 Tensorflow wheel even
        # though our PyPI server should take precedence so we'll force the URL.
        if dependency.startswith('tensorflow') and os.uname().machine == 'x86_64':
            tf_version = re.search('\d+.\d+.\d+', dependency).group(0)
            dependency = f'https://pypi.epixstudios.co.uk/packages/tensorflow-{tf_version}-cp38-cp38-linux_x86_64.whl'

        if dependency and not dependency.startswith('#'):
            cmd = ['/usr/local/bin/pip', 'install', '--no-cache-dir', dependency]
            env = dict(os.environ)  # Need to pass all envvars down to subprocesses or we get compilation errors for C extensions
            env['PYTHONUNBUFFERED'] = '1'  # Without this we don't get real-time output from Python-based subprocesses
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
            processor = LineProcessor(username=username, password=password, env=env)

            for line in proc.stdout:
                line = line.rstrip().decode('utf-8')
                print(line)
                if '\n' in line:
                    for sub_line in line.split('\n'):
                        processor.process_line(sub_line)
                else:
                    processor.process_line(line)

            if proc.wait() != 0:
                exit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('-u', '--username', help='Custom PyPI server username')
    parser.add_argument('-p', '--password', help='Custom PyPI server password')
    args = parser.parse_args()

    install_and_upload(username=args.username, password=args.password)
