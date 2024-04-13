#!/bin/bash

# Function to show access info
function show_access_info() {
    echo "Access API server on http://localhost:9696"
    echo "Access Postgres DB on http://localhost:5436"
    echo "Access Redis on http://localhost:6380"
    echo "Access frontend on http://localhost:3001\n"
}

# Function to attach to the screen session
function attach_to_screen() {
    screen -r docker-compose-watch
}

# Create a new screen session and run docker-compose watch
function start_docker_watch(){
    screen -S docker-compose-watch -m bash -c "echo -e \"The development environment is getting ready. Please be patient.\nType the following to go to main screen\n<Ctrl> + A, D\" && sleep 2 && docker-compose watch"
}

# Function to restart Docker watch
function restart_docker_watch() {
    screen -S docker-compose-watch -X quit
    start_docker_watch
}

function open_browser() {
    local port=$1
    echo -e "Openning browser at localhost:$port"

    # Check if the system is macOS
    if [[ $(uname) == "Darwin" ]]; then
        open "http://localhost:$port"
    # Check if the system is Windows
    elif [[ $(uname -o 2>/dev/null) == "Msys" ]]; then
        start "http://localhost:$port"
    # Assume Linux/Unix-like system
    else
        xdg-open "http://localhost:$port"
    fi
}

function show_header(){

    echo "                                                                                            ";
    echo "██████╗  ██████╗ ██████╗  █████╗     ███╗   ███╗███████╗████████╗██████╗ ██╗ ██████╗███████╗";
    echo "██╔══██╗██╔═══██╗██╔══██╗██╔══██╗    ████╗ ████║██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝██╔════╝";
    echo "██║  ██║██║   ██║██████╔╝███████║    ██╔████╔██║█████╗     ██║   ██████╔╝██║██║     ███████╗";
    echo "██║  ██║██║   ██║██╔══██╗██╔══██║    ██║╚██╔╝██║██╔══╝     ██║   ██╔══██╗██║██║     ╚════██║";
    echo "██████╔╝╚██████╔╝██║  ██║██║  ██║    ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║██║╚██████╗███████║";
    echo "╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝";
    echo "                                                                                            ";

}

# Function to show the menu
function show_menu() {

    echo -e "\nMenu Options:"
    echo "a : Inspect docker-watch"
    echo "o : Open browser"
    echo "i : Show access info"
    echo "r : Restart docker watch"
    echo "x : Exit"
}

# Function to stop Docker containers and exit
function exit_script() {
    echo -e "\nStopping..."
    screen -S docker-compose-watch -X quit
    docker-compose down -v
    exit 0
}

# Display header
show_header

# Display the access URLs
show_access_info

start_docker_watch

# Check if the screen session was created successfully
if [ $? -ne 0 ]; then
    echo "Failed to create screen session. Exiting the program."
    exit 1
fi


# Listen for interrupt signal (Ctrl+C)
trap 'screen -S docker-compose-watch -X quit; docker-compose down -v; exit 0' INT


# Keep the script running until interrupt signal is received
while true; do

    # show menu
    show_menu

    # Read user input
    read -n 1 option
    echo ""

    # Handle user input
    case $option in
        a)
            clear
            show_header
            attach_to_screen
            ;;
        o)
            clear
            show_header
            open_browser 3000
            ;;
        i)
            clear
            show_header
            show_access_info
            ;;
        r)
            clear
            show_header
            restart_docker_watch
            ;;
        x)
            clear
            show_header
            exit_script
            ;;
        *)
            clear
            show_header
            echo "Invalid option. Please try again."
            ;;
    esac
done
