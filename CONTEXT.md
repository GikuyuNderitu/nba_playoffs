# Tournament Viewer (Spoiler-Free)

A generalized, deployable, and shareable web application designed to let users catch up on sports and gaming tournaments chronologically without spoilers.

## Language

**Tournament**:
The overall sporting or gaming competition.
_Avoid_: Event, competition

**Stage**:
A high-level division of a Tournament.
_Avoid_: Phase, bracket stage, bracket

**Matchup**:
A series of contests played between two specific teams or contenders in a Stage.
_Avoid_: Series, battle, clash

**Game**:
A single contest within a Matchup.
_Avoid_: Match, play

**Dynamic Timeline**:
A chronological list of games that only displays completed (Watched or Skipped) games and currently Unlocked games, omitting future Locked games to prevent spoilers.
_Avoid_: Schedule, static timeline, calendar feed

**Feeder Matchup**:
A preceding Matchup whose winner advances to participate in a subsequent Matchup.
_Avoid_: Parent matchup, qualifying matchup

**TBD Matchup**:
A Matchup in a subsequent Stage whose contenders are not yet determined because one or both Feeder Matchups are incomplete.
_Avoid_: Unresolved matchup, blank matchup

**Watch Session**:
A unique record in the database tracking a user's progress (Watched and Skipped states) for a Tournament. It can be shared via a URL parameter or cloned to start a new independent progress path.
_Avoid_: User account, login profile

**Import Template**:
A configuration preset (consisting of regex patterns and parsing rules) used by the importer to extract contenders, stage name, game number, date, and version priorities from video titles in a playlist.
_Avoid_: Parser config, scraping rule





## States

**Locked**:
A state of a Game indicating it cannot yet be played or revealed because its predecessor is not completed.
_Avoid_: Hidden, closed

**Unlocked**:
A state of a Game indicating it is available to be played or revealed.
_Avoid_: Visible, active

**Unwatched**:
The initial completion state of an Unlocked Game before the user interacts with it.
_Avoid_: Pending, new

**Watched**:
The completion state of a Game after the user finishes watching its associated video.
_Avoid_: Played, finished, completed

**Skipped**:
The completion state of a Game after the user manually bypasses it.
_Avoid_: Ignored, passed

