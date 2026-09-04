import random
from datetime import datetime, timedelta

random.seed(42)

SENSORS = {
    "SNS-M101-T": (55, 3),   # baseline, noise stddev
    "SNS-M101-V": (3.2, 0.4),
    "SNS-P220-T": (62, 3),
    "SNS-P220-V": (4.0, 0.4),
    "SNS-P221-T": (60, 3),
    "SNS-P221-V": (3.8, 0.4),
    "SNS-C301-T": (48, 2.5),
}

start = datetime(2026, 2, 22, 0, 0)
end = datetime(2026, 2, 28, 22, 0)

rows = []
t = start
while t <= end:
    for sensor_id, (base, noise) in SENSORS.items():
        value = base + random.gauss(0, noise)
        # P-220 develops a real anomaly starting 2026-02-26: thermal
        # and vibration both trend upward, matching the alert events.
        if sensor_id in ("SNS-P220-T", "SNS-P220-V") and t >= datetime(2026, 2, 26, 6, 0):
            hours_into = (t - datetime(2026, 2, 26, 6, 0)).total_seconds() / 3600
            drift = min(hours_into * 0.9, 30) if sensor_id == "SNS-P220-T" else min(hours_into * 0.12, 4.5)
            value += drift
        rows.append((sensor_id, t.strftime("%Y-%m-%d %H:%M:%S"), round(value, 2)))
    t += timedelta(hours=2)

with open("sql/15b_sensor_readings_seed.sql", "w", encoding="utf-8") as f:
    f.write("INSERT INTO conformed.fact_sensor_reading (sensor_id, reading_time, value) VALUES\n")
    lines = [f"('{s}', '{ts}', {v})" for s, ts, v in rows]
    f.write(",\n".join(lines))
    f.write(";\n")

print(f"Generated {len(rows)} sensor readings.")
