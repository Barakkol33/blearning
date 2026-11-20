#!/bin/sh
# The game's tests. The pipeline runs them on every new image, before anything reaches players.
#   ./test.sh game-site:v2
img="$1"

echo "   test 1: the page has its title and the game"
grep -q '<title>Space Dodge</title>' index.html && grep -q '<canvas id="game">' index.html || exit 1

echo "   test 2: the web server's config is valid (nginx -t)"
docker run --rm "$img" nginx -t >/dev/null 2>&1 || exit 1

echo "   test 3: the container starts and serves the page"
cid=$(docker run -d --rm "$img") || exit 1
ok=1
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec "$cid" wget -qO- http://127.0.0.1/ 2>/dev/null | grep -q '<title>Space Dodge</title>'; then ok=0; break; fi
  sleep 0.5
done
docker stop "$cid" >/dev/null
exit $ok
