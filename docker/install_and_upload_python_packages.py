from subprocess import Popen, PIPE


def install_and_upload():
    # A lot of packages don't have pre-compiled binaries for other
    # architectures which makes installation take a long time. Installing via
    # this script uploads built .whl packages to a private PyPI server so
    # they're cached for next time.

    with open('/srv/requirements.txt') as f:
        for line in f.readlines():
            print(line.strip())
            child = Popen(['pip', 'install', line], stdout=PIPE, stdin=PIPE, stderr=PIPE)
            data = child.communicate()[0].decode('utf-8')
            print(data)
            if child.returncode != 0:
                exit(1)

            if 'Created wheel' in data:
                whl_name = None
                for install_line in data.split('\n'):
                    if 'Created wheel for' in install_line:
                        whl_name = install_line.split('filename=')[1].split(' ')[0]
                    if 'Stored in directory' in install_line:
                        folder = install_line.split('Stored in directory:')[1].strip()
                        child = Popen(['pypiupload', 'files', f'{folder}/{whl_name}', '-i', 'epix'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
                        data = child.communicate()[0].decode('utf-8')
                        print(data)
                        if child.returncode != 0:
                            exit(1)
                        print()

if __name__ == '__main__':
    install_and_upload()
