#!/bin/sh

#cd /code
pushd ./c361/frontend
node node_modules/gulp/bin/gulp.js make
popd
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver_plus 0.0.0.0:8000
