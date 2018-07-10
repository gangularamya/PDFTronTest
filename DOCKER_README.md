## PDFTRON SAMPLE README


#### REQUIREMENTS

Windows 10, Windows Server 2016, or a Linux distribution.

It is possible to run this sample with other versions of Windows if you are able to install Docker.

#### INSTALLING DOCKER

Contained in this package is a Docker setup for running WebViewer using range streaming.
The package is built with Debian Linux, Tomcat9 and OpenJDK 8. To use this package, first install
docker at:

    https://docs.docker.com/engine/installation/
    
### STARTING THE SAMPLE WITH DEFAULTS

Open a command line, navigate to this directory and call:

    docker-compose up

You can now access the demo app on http://localhost:8090/demo/?s

### CONFIGURING THE CONTAINER

Arguments for building can be changed in the docker-compose.yml file. If you change the variables
in this file you must call this to rebuild and restart the container:

    docker-compose build --no-cache 
    docker-compose up -d

#### ACCESSING THE DEMO

To access the demo, navigate to http://localhost:8090/demo?s

#### STOPPING THE CONTAINER

    docker-compose down

The webviewer-sample line can also be replaced with the container id.

#### VIEW THE LOGS

    docker-compose logs : shows all the logs
    docker-compose logs : shows all the logs, and continues following them

#### ATTACHING TO THE RUNNING CONTAINER

If you wish to see inside of the running docker container and perform actions on it while it runs, do the following:

    docker-compose exec pdfd-tomcat bash

You should now have access to the running docker container.

### TROUBLESHOOTING

Tomcat fails to start.

- This means you either have a http server on port 8090, or are already running the container. Stop the container
or the HTTP server before running the sample again.

When I try to build the container on Windows, it tells me the system isn't supported.

- Right click on your docker icon in the taskbar tray and select 'Use Linux Containers'

When I try to use docker on Linux it fails with permission errors.

- Docker commands need to be run with sudo, do so for all the commands. It is possible to run it without sudo,
but requires extra user setup.

I was not able to use regular docker and had to use docker tools, I can't connect to basic.html.

- Open up a docker window and type 'docker-machine ip', this should list the ip for the container.
Use this ip instead of localhost: 192.x.x.x:8090/pdftron/basic.html?settings=true
