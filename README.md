# Meme Matchup Mania

Product Requirements Document (PRD)

Memes War

Version: 1.0 Status: Draft Author: [Your Name] Date: August 5, 2026

1. Overview

1.1 Product Summary

Memes War is a real-time, multiplayer party game where players compete to select the emoji or meme that best represents a given prompt or situation. After all players submit their choice, everyone votes on the best submission. Points are awarded based on popularity of a player's pick and the accuracy of their vote relative to the crowd. The player with the most points at the end of the game wins.

1.2 Problem Statement

People want lightweight, social, laugh-out-loud games to play with friends (in person or remotely) that require no downloads of complex rules, minimal setup, and work great over a shared screen or individual devices — similar to games like Jackbox Party Pack or Kahoot, but centered on emoji/meme humor and social prediction rather than trivia.

1.3 Goals

Deliver a fast, fun, low-friction social party game playable in under 5 minutes to learn

Support groups of 3–20 players in a single room

Create a game loop that rewards both creativity (submission) and social awareness (voting/prediction)

Build a foundation that can expand into user-generated content (custom prompts, meme images, GIFs)

1.4 Non-Goals (v1)

Single-player mode

Real-money prizes or gambling mechanics

Voice/video chat integration (players are expected to be in the same room or on a separate call)

Custom meme image uploads (emoji-only for v1; meme/GIF support is a fast-follow)

2. Target Audience

SegmentDescriptionPrimaryFriend groups (ages 13+) looking for a party/icebreaker game, in-person or remoteSecondaryFamilies, classrooms, team-building/corporate eventsTertiaryStreamers/content creators who want interactive audience games

3. User Roles

3.1 Host

Creates and owns the game room

Shares the room code with other players

Starts the game and controls round pacing (start, skip, pause, end game)

Poses/selects prompts (or the game auto-selects from a prompt bank)

Views live player list, scores, and leaderboard

Cannot vote or submit answers (host is a moderator, not a competitor) — open question, see Section 9

3.2 Player

Joins a room using a room code

Submits one emoji per round in response to the prompt

Votes on the best submission from the revealed options (cannot vote for their own)

Accumulates points across rounds

Views live leaderboard and personal stats

4. Core Game Flow

PhaseDescriptionDuration1. SetupHost creates room, players join via codeUntimed2. Prompt RevealPrompt is displayed to all players5 sec3. SubmissionEach player privately picks one emoji from a grid; choice locks once made60 sec4. RevealAll submitted emojis are displayed, anonymized or attributed (see open questions)10 sec5. VotingEach player votes for their favorite submission (not their own)30 sec6. ScoringVotes are tallied, points awarded, leaderboard updates10 sec7. Round TransitionBrief pause before next prompt5 sec

The game repeats steps 2–7 for a host-configured number of rounds (default: 5), then displays a final results screen.

5. Scoring System

ActionPointsYour submission wins the round (most votes)+10Each vote your submission receives+5 per voteYou vote for the winning submission+3

Example: Prompt: "Best emoji for joy?"

Aiman picks 😊 (3 votes)

Sara picks 😄 (5 votes) → Winner

Yousef picks 🤩 (2 votes)

Result:

Sara: 10 (win) + 5×5 (votes) = 35 pts

Aiman: 3 (voted for winner) + 5×3 (votes) = 18 pts

Yousef: 3 (voted for winner) + 5×2 (votes) = 13 pts

(Note: if a player votes for the winning submission AND is the one who submitted it, the "voted for winner" bonus should not double-count — see Section 9, open questions.)

6. Feature Requirements

6.1 MVP (v1) Features

[ ] Room creation with unique, shareable room code (e.g., 6-character alphanumeric)

[ ] Join-by-code flow (no account required)

[ ] Host controls: start game, skip round, pause, end game, kick player

[ ] Prompt bank (min. 50 pre-written prompts at launch)

[ ] Emoji picker grid (curated set, not full Unicode emoji keyboard, to keep choices meaningful)

[ ] Submission lock (no changes after selecting)

[ ] Countdown timers for each phase, synced across all clients

[ ] Anonymous reveal of submissions before voting (prevents bias/bandwagon voting)

[ ] Voting screen (cannot vote for own submission)

[ ] Real-time score calculation and leaderboard

[ ] End-of-game final leaderboard + winner celebration screen

[ ] Reconnect handling (player disconnects mid-round, can rejoin same room/session)

6.2 Fast-Follow (v1.1–v2)

[ ] Achievements system ("First Pick," "Loyal Voter," "The King")

[ ] Player titles/ranks based on lifetime points ("Star" at 100 pts, "Legend" at 500 pts)

[ ] Player statistics (rounds played, rounds won, high score, average score)

[ ] Custom prompt creation by host

[ ] Meme/GIF submissions in addition to emoji

[ ] Sound effects and music

[ ] Themed prompt packs (e.g., work life, relationships, pop culture)

[ ] Spectator mode (watch without playing)

6.3 Explicitly Out of Scope (v1)

User accounts / persistent login

Cross-session leaderboards or global rankings

Monetization (ads, IAP) — to be evaluated post-launch

Native mobile apps (v1 targets responsive web)

7. Screens / UI Requirements

ScreenKey ElementsWelcome ScreenLogo, tagline, "Play" CTAMode Selection"Create Room" / "Join Room" buttonsHost LobbyRoom code (large, shareable), live player list, "Start Game" buttonJoin ScreenRoom code input, nickname inputPrompt/Submission ScreenCurrent prompt, emoji grid, countdown timer, "locked" confirmation stateReveal ScreenGrid of all submitted emojis (with vote-count placeholders hidden until voting ends)Voting ScreenSame grid, tap-to-vote, countdown timerResults ScreenWinning emoji highlighted, point breakdown per player, updated leaderboardHost Control PanelPlayer list, scores, prompt controls, pause/skip/end buttonsFinal LeaderboardFull ranking, winner celebration animation

8. Non-Functional Requirements

CategoryRequirementPerformanceReal-time sync latency under 500ms for state updates (submissions, votes, timer) across all clientsScalabilitySupport minimum 20 concurrent players per room; target 1,000+ concurrent rooms at launchPlatformResponsive web app (mobile + desktop browsers); no install requiredReliabilityGraceful handling of player disconnect/reconnect without disrupting the round for othersAccessibilityMinimum WCAG 2.1 AA compliance (color contrast, screen-reader labels on interactive elements)LocalizationArabic and English at launch, given the source concept and likely primary market; architecture should support adding languagesSecurityNo PII required to play (nickname only); room codes expire after session ends or after a timeout of inactivity

9. Open Questions / Decisions Needed

Anonymity of submissions: Should players see who submitted which emoji during the reveal phase, or should submissions be anonymized until after voting to reduce popularity bias? (Recommended: anonymize until scoring.)

Can the Host play? Should the host be a moderator-only role, or can they also submit/vote like a player?

Double-counting rule: If a player's own submission wins, do they also receive the "voted for winner" bonus, or is that reserved for players who did not submit the winning emoji?

Tie-breaking: How are ties handled when two emojis receive the same number of votes?

Minimum players: What's the minimum number of players required to start a game (e.g., 3)?

Prompt sourcing: Are prompts entirely pre-written, or can the community/host submit new prompts for review and inclusion in the bank?

Content moderation: If custom prompts or meme uploads are introduced (v1.1+), what moderation system prevents inappropriate content?

10. Success Metrics

MetricTarget (first 90 days)Rooms created10,000+Avg. players per room5+Avg. session length10+ minutesRound completion rate90%+ (rounds that finish without players dropping off)Player return rate (D7)25%+

11. Milestones (Suggested)

MilestoneDeliverableM1Core game loop working end-to-end (single room, no polish)M2Real-time sync, reconnect handling, host controlsM3UI/UX polish, prompt bank finalized, scoring validatedM4Beta testing with real friend groups, bug fixesM5Public launch (v1)M6Fast-follow features (achievements, custom prompts, meme support)

12. Appendix: Sample Prompts

Best emoji for love?

Best emoji for success?

Best emoji for sadness?

Best emoji for laughter?

Best emoji for anger?

Best emoji for fear?

Best emoji for surprise?

Best emoji for boredom?

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://memes-war.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2a7a904d-3d1f-473a-ac7e-1ee93d7873ad).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
