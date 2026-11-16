#!/bin/sh
# Ask nginx to re-read its config and certificates. nginx checks for this file every 30 s
# (the loop in its compose `command`) and runs `nginx -t && nginx -s reload` — a graceful reload,
# not a restart. certbot used to do it through the Docker socket, which is root on the host.
mkdir -p /var/run/nginx-signals
date > /var/run/nginx-signals/reload
echo "🔁 nginx reload requested (picked up within 30 s)"
