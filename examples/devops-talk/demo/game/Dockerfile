# The recipe for the game's container: a web server, plus our two files.
FROM nginx:1.27-alpine

# the version and its color are baked into the image when it's built
ARG VERSION=dev
ARG COLOR=#8250df
ENV VERSION=$VERSION COLOR=$COLOR POD_NAME=my-laptop NODE_NAME=my-laptop

COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
