CREATE TABLE IF NOT EXISTS ticks (
  ts DateTime64(3),
  symbol String,
  price Float64,
  volume UInt64
) ENGINE = MergeTree()
ORDER BY (symbol, ts);

CREATE TABLE IF NOT EXISTS bars_1m (
  bucket DateTime,
  symbol String,
  open Float64,
  high Float64,
  low Float64,
  close Float64,
  vol UInt64
) ENGINE = MergeTree()
ORDER BY (symbol, bucket);
