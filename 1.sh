count=0
wait=1
wait_max=10

waitFor() {
    while [ "$count" -le "$wait_max" ]; do
        if [ "$count" -eq "5" ]; then
            return 0
        fi
        echo "Waiting ${wait} seconds before retrying ($count/$wait_max)"
        sleep "$wait"
        count=$((count + 1))

    done
}

waitFor

echo "code:$?"
