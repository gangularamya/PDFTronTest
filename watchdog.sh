#!/bin/bash

echo Starting ssh service...
service ssh start

catalina.sh run & 
restart_count=0
last_restart=$SECONDS

while true; do
    ps -aux | grep -v grep | grep catalina > /dev/null
    if [ $? -ne 0 ] && [ $restart_count -le 5 ]; then
        time_difference=`expr $SECONDS - $last_restart`
        if [ $restart_count -ge 5 ] && [ $time_difference -le 30 ]; then
            echo "Application has crashed too often within a short time period. Please review your error logs."
            exit 1
        fi
        catalina.sh run &
        last_restart=$SECONDS
        ((restart_count++))
        echo "RESTART COUNT $restart_count"
    fi
    sleep 2
done
