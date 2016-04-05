#!/bin/sh

pip install -r requirements.txt
python manage.py migrate
python manage.py createcachetable
python manage.py runserver_plus 0.0.0.0:$PORT
