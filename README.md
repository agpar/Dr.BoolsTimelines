#C361 Project.
Sniff it up.

To teammates:

Clone this repository to some directory, which I'll call $C361. Create a python3 virtual environment in $C361 and install requirements, like so.
```bash
cd $C361
virtualenv --python=python3 .env #create a local copy of python in $C361/.env/
source .env/bin/activate #load this new copy of python as your environmental default
pip install -r requirements.txt #install the requirements into your new virtualenv.
```
I switched Django to use SQLite instead of PostgreSQL. SQLite is a python database implementation that comes packaged with django and is extremely portable. To create and migrate your SQL database for the project, run the following command (while sourced from the virtual environment you created above.
```
python manage.py migrate
```

If everything went smoothly, you now have a working webapp. Run `python manage.py runserver` to launch the server, and browse to `localhost:8000` to check out the default project page.

-Alex
