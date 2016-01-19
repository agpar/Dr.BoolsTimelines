#!/bin/sh

cd /code
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver_plus 0.0.0.0:8000