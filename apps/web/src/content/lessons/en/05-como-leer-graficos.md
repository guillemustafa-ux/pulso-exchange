# How to read price charts

Candlestick charts are the standard for visualizing prices in crypto markets, and they're also what PULSO uses in the Market module (with the lightweight-charts library). Each candle represents a fixed time period (1 minute, 1 hour, 1 day — the "timeframe") and shows four data points: the **open** and **close** prices for that period (the candle's body, green if it closed above where it opened, red if it closed below), and the **high** and **low** reached (the wicks above and below the body). Reading a single candle tells you little; reading the sequence of candles and how they behave across different timeframes is what starts producing useful information.

Two concepts appear in almost any analysis: **support** and **resistance**. Support is a price level where, historically, buying demand stopped a decline; resistance is the inverse level, where selling pressure stopped a rally. They aren't magic lines nor mathematically exact — they're zones where many market participants tend to react in similar ways, which is why they work as reference points, not guarantees. **Volume** (how much was traded in each period) is just as important as price: a price move on low volume says much less than the same move on high volume, because it reflects how much real conviction is behind the move.

The most common technical indicators are averages and oscillators built on top of price: **moving averages** (SMA, EMA) smooth out short-term noise to show the underlying trend, and the crossover between a short and a long average is sometimes used as a trend-change signal. The **RSI** (Relative Strength Index) measures whether an asset is "overbought" or "oversold" relative to its own recent history, on a scale of 0 to 100. None of these indicators predict the future: they're ways of summarizing the past that help make better-informed decisions, not formulas that guarantee an outcome.

The most important discipline when reading a chart isn't technical, it's psychological: technical analysis helps you understand a price's context, but it doesn't remove risk or replace sensible risk management (never invest what you can't afford to lose, don't chase an asset that has already pumped out of fear of missing out — the well-known FOMO). A pretty chart with an uptrend is not, by itself, a sufficient reason to invest.

<!-- quiz -->
```json
[
  {
    "question": "What do the 'wicks' of a candlestick represent?",
    "options": [
      "The volume traded in that period",
      "The highest and lowest prices reached during that period",
      "The opening price only",
      "The 7-day average"
    ],
    "correctIndex": 1,
    "explanation": "The candle's body marks open/close; the wicks mark the period's extremes (high and low)."
  },
  {
    "question": "What is a 'support' level on a price chart?",
    "options": [
      "A mathematical guarantee that the price won't fall further",
      "A zone where, historically, buying demand tended to stop price declines",
      "The lowest possible price an asset can reach",
      "An indicator calculated automatically by the exchange"
    ],
    "correctIndex": 1,
    "explanation": "Support and resistance are reference zones based on historical behavior, not guaranteed levels."
  },
  {
    "question": "Why is volume relevant alongside price?",
    "options": [
      "It isn't relevant, only price matters",
      "Because a price move on high volume reflects more real conviction than the same move on low volume",
      "Because volume determines the exact closing price",
      "Because it replaces moving averages"
    ],
    "correctIndex": 1,
    "explanation": "Volume gives context about how much real participation is behind a price move."
  },
  {
    "question": "What is true about technical indicators (moving averages, RSI)?",
    "options": [
      "They guarantee the outcome of the next trade",
      "They are ways of summarizing past price behavior, not certain predictions of the future",
      "They only work on 1-minute timeframes",
      "They completely remove the need for risk management"
    ],
    "correctIndex": 1,
    "explanation": "Technical indicators help interpret historical context, but no indicator predicts the future with certainty."
  }
]
```
