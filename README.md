# CIDR game

A simple CIDR html page to practise basic/initial ip calculations

# Local usage with docker
You will need to have docker installed in order to run it containerized (although it might seem over-engineering for a simple page like this)

Build it:

``docker build -t taller-cidr .``

Run it on port 8080:

``docker run -d --name taller-cidr -p 8080:80 --restart unless-stopped taller-cidr``


