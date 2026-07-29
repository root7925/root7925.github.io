# Leslie / Play Sharing and Growth Standard

## Product principle

Sharing begins with an earned moment. A player should share because the result
says something true about them, not because the interface bribed them to
advertise.

Every shipped game therefore uses this loop:

```text
complete a real puzzle
        ↓
earn a collection title
        ↓
challenge a friend to the exact same puzzle
        ↓
friend lands directly in that puzzle
```

For an endless game, the earned moment may be a verified local run instead:

```text
finish a real run
        ↓
earn a score title
        ↓
share score + clean-result count
        ↓
friend lands on a fresh, private run
```

## Required behavior

- Award titles only from verified local completion counts.
- Include the game, puzzle number, and difficulty in the share text.
- Deep-link to the exact puzzle rather than the portfolio homepage.
- Prefer the native share sheet on supported devices.
- Fall back to copying the message and URL.
- Never claim a global rank, percentile, streak, or scarcity without data.
- Do not unlock a reward merely because a player opened the share sheet. That
  action cannot prove that another person received or played the challenge.
- A cancelled share must not display a success message.
- Shared URLs must not reveal progress, identity, solution data, or private
  generator parameters.
- Endless-score shares must not serialize the board, random state, or seed.
- Do not claim a rank or percentile without a real comparison population.

## Reusable implementation

`/shared/share-core.js` owns:

- completion-title selection;
- clean challenge URL construction;
- consistent challenge copy;
- native-share and clipboard fallback behavior.

Each game owns only its title ladder, puzzle parameter, and completion detail.
The shared behavior is covered by repository-level tests and included in both
games' release fingerprints.

## Measurement when analytics is added

Do not install analytics solely to count button clicks. When the portfolio has
enough real traffic to justify measurement, collect only:

- `puzzle_completed`
- `challenge_share_opened`
- `challenge_landed`
- `challenge_completed`

The useful metric is:

`challenge completions / challenge landings`

Share-button clicks alone are a vanity metric. Referral identifiers may be
added later only if they are anonymous, short-lived, and explained in the
privacy statement.
