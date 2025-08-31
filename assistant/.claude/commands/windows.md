# Window Management

Get optimal window open/close times for Seattle based on 75°F threshold.

## Process

1. **Get today's forecast**: Search "Seattle WA weather hourly forecast today" or use National Weather Service
2. **Find 75°F crossings**: Identify when temperature crosses above/below threshold

## Output Format

**Today's Forecast:** [High/conditions summary]

**Window Actions:**

- Close at [time] (temp rising above 75°F)
- Open at [time] (temp dropping below 75°F)
- OR: Keep open all day (never exceeds 75°F)
- OR: Keep closed all day (stays above 75°F)
