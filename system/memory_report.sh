#!/bin/sh
# Print per-process memory (largest first) and the container cgroup total.
# Columns: RSS MB, PSS MB (when /proc/<pid>/smaps_rollup is readable), command.
for d in /proc/[0-9]*; do
  pid=${d#/proc/}
  [ -r "$d/status" ] || continue
  rss=$(awk '/^VmRSS:/{print $2}' "$d/status" 2>/dev/null)
  [ -n "$rss" ] || continue
  pss=$(awk '/^Pss:/{print $2}' "$d/smaps_rollup" 2>/dev/null)
  cmd=$(tr '\0\n' '  ' < "$d/cmdline" 2>/dev/null | cut -c1-100)
  echo "$rss ${pss:--1} $pid $cmd"
done | sort -rn | awk '{
  rss=$1/1024; pss=($2<0)?"n/a":sprintf("%.0f",$2/1024);
  c=$0; sub(/^[^ ]+ [^ ]+ [^ ]+ ?/,"",c);
  printf "RSS %7.0f MB  PSS %5s MB  pid %-6s %s\n", rss, pss, $3, c }'
for f in /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory/memory.usage_in_bytes; do
  if [ -r "$f" ]; then
    echo "cgroup total: $(( $(cat "$f") / 1048576 )) MB"; break
  fi
done
