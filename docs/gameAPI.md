## Game HTTP API

`/games/`: Returns list of all games.
`/game/[id]/`: Returns single games information.

## Starting and Stopping Games

`/game/[id]/?start=true`
Load a pykka actor for the game with given ID. The game will start off
paused. All editing of the game must be done while it is paused. No
new turns can be requested while a game is paused.

`/game/[id]/?stop=true&on_turn=[int]`
Destroy pykka actor for game. Computed turns and actor state are
dumped to database before destruction. `on_turn` should be the turn
the user is currently viewing. This make sure to delete any pre_computed
turns and reset db values to the correct turn.

`/game/[id]/?pause=true&on_turn=[int]`
Pause a game at a specific turn. The `on_turn` key is there to let the
backend know at which turn we should begin recomputing from if the user
applies any edits.

`/game/[id]/?resume=true`
Resume a paused game. From now on, all games start paused, so you should
make this request immediately after starting a game.


## Getting deltas

`/game/[id]/turns/?first=[int]&last=[int]`
Get all turns from `first` to `last`. Response is a list of dicts. Each
dict has a `number` and a `delta_dump` list. Both lists are correctly
ordered by default. 

This endpoint will either retrieve all the turns from the database,
or it will compute up to `last` and return the computed deltas.

If `last` is greater than the most recent computed turn for a game
that is not running (or is paused), you will get an error.

## Patching

A game (`/game/[id]/`) can accept the following dictionaries of modifications
sent in via a PATCH request.

### Adding actor to running game.
```
{ 'id': [int], 'action': 'add', 
  'type': 'actor', 
  'coords': {'x': [int], 'y': [int]}}

```