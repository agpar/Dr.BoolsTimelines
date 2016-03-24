# -*- coding: utf-8 -*-
# Generated by Django 1.9.1 on 2016-03-23 15:17
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('c361', '0009_remove_gameactormodel_food'),
    ]

    operations = [
        migrations.AddField(
            model_name='gameactormodel',
            name='copy_of',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='c361.GameActorModel'),
        ),
        migrations.AlterField(
            model_name='gameactormodel',
            name='direction',
            field=models.CharField(default='NORTH', max_length=20),
        ),
    ]
