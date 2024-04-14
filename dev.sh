#!/bin/bash

#########################################################################
##################### Parse CLI options #################################
#########################################################################

identity_file=""
local_port=""
remote_host=""
remote_port=""
ssh_user=""
ssh_host=""

ssh_cmd=""
usage() {
    echo "Usage: $0 [-i identity_file] [-l local_port] [-r remote_host] [-p remote_port] [-u ssh_user] [-h ssh_host]"
    exit 1
}

while getopts ":i:l:r:p:u:h:" opt; do
    case $opt in
        i) identity_file="$OPTARG" ;;
        l) local_port="$OPTARG" ;;
        r) remote_host="$OPTARG" ;;
        p) remote_port="$OPTARG" ;;
        u) ssh_user="$OPTARG" ;;
        h) ssh_host="$OPTARG" ;;
        \?) echo "Invalid option: -$OPTARG" >&2; usage ;;
        :) echo "Option -$OPTARG requires an argument." >&2; usage ;;
    esac
done

# Check if any argument is provided
if [[ ! -z $identity_file || ! -z $local_port || ! -z $remote_host || ! -z $remote_port || ! -z $ssh_user || ! -z $ssh_host ]]; then
    # Check if all arguments are provided
    if [[ -z $identity_file || -z $local_port || -z $remote_host || -z $remote_port || -z $ssh_user || -z $ssh_host ]]; then
        echo "Error: All arguments must be provided."
        usage
    else
      docker_host=$(get_docker_interface_ip)
      ssh_cmd="ssh -i $identity_file -L $docker_host:$local_port:$remote_host:$remote_port $ssh_user@$ssh_host"
    fi
fi


#########################################################################
############################# Functions #################################
#########################################################################
#
function check_docker_daemon() {
    docker info >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to show access info
function show_access_info() {
    echo "Access API server on http://localhost:9696"
    echo "Access Postgres DB on http://localhost:5436"
    echo "Access Redis on http://localhost:6380"
    echo -e "Access frontend on http://localhost:3005\n"
}

# Function to attach to the screen session
function attach_to_screen() {
    screen -r docker-compose-watch
}

# Create a new screen session and run docker-compose watch
function start_docker_watch(){
    screen -S docker-compose-watch -m bash -c "echo -e \"\e[1;32mThe development environment is getting ready. Please be patient.\nUse the following commands -\n <Ctrl - a> + d - Go to main menu\n <Ctrl - a> + ESC - Make screen scrollable\n\e[0m\" && sleep 2 && docker-compose watch"
}

# Function to restart Docker watch
function restart_docker_watch() {
    screen -S docker-compose-watch -X quit
    docker-compose down -v
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

function follow_docker_logs(){
    screen -S docker-logs -m bash -c "echo -e \"\e[1;32mUse the following commands -\n <Ctrl - a> + d - Go to main menu\n <Ctrl - a> + ESC - Make screen scrollable\n\e[0m\" && sleep 1 && docker logs dora-metrics -f"
}

function inspect_inside_container(){
    screen -S docker-exec -m bash -c "docker exec -it dora-metrics /bin/bash"
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
    echo "by Middleware";
    echo "                                                                                            ";

}

TUNNEL_ENABLED=false

function start_db_ssh_tunnel() {
  screen -S stage-ssh-tunnel -X quit
  if [[ -z $identity_file || -z $local_port || -z $remote_host || -z $remote_port || -z $ssh_user || -z $ssh_host ]]; then
    TUNNEL_ENABLED=false
  else
    TUNNEL_ENABLED=true
    screen -S stage-ssh-tunnel -d -m bash -c "echo -e \"\e[1;32mSSH Tunnel started.\nUse the following commands -\n <Ctrl - a> + d - Go to main menu\n <Ctrl - a> + ESC - Make screen scrollable\n\e[0m\" && $ssh_cmd"
    echo -e "\n\e[32mTunnel Started\n\e[0m"
  fi
}

# function to attach tunnel screen
function attach_to_tunnel_screen() {
    screen -r stage-ssh-tunnel
}

# function to show ip addr of docker interface
get_docker_interface_ip() {
    local docker_ip
    docker_ip=$(ip -o -4 addr show docker0 | awk '{print $4}' | cut -d'/' -f1)
    echo "$docker_ip"
}

# Function to show the menu
function show_menu() {
    if [ "${TUNNEL_ENABLED}" = false ]; then
      echo -e "\n\e[31mSTAGE_TUNNEL environment variable doesn't exist. SSH tunneling will not be used.\e[0m"
    fi

    echo -e "\nMenu Options:"
    echo "a : Inspect docker-watch"
    echo "o : Open browser"
    echo "i : Show access info"
    echo "r : Restart docker watch"
    echo "l : View docker logs"
    echo "e : Inspect docker container using exec"
    echo "t : Tunnelling options"
    echo "x : Exit"
}

# Function to stop Docker containers and exit
function exit_script() {
    echo -e "\nStopping..."
    screen -S docker-compose-watch -X quit
    screen -S docker-exec -X quit
    screen -S docker-logs -X quit
    screen -S stage-ssh-tunnel -X quit
    docker-compose down -v
    exit 0
}

clear 

#########################################################################
##################### Start Main Program ################################
#########################################################################
# check if docker is running
check_docker_daemon

# start ssh tunnel
start_db_ssh_tunnel

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

function tunnelling_menu(){
  while true; do
    clear
    # Display header
    show_header

    if [ "${TUNNEL_ENABLED}" = false ]; then
      echo -e "\n\e[31mSTAGE_TUNNEL environment variable doesn't exist. SSH tunneling will not be used.\e[0m"
    fi

    echo -e "\nTunnelling Options:"
    echo "i : View Tunnel"
    echo "r : Restart Tunnel"
    echo "x : Go Back"

    read -n 1 tunnel_option
    echo ""
    case $tunnel_option in 
      i)
        clear
        attach_to_tunnel_screen
        ;;
      r)
        clear
        show_header
        start_db_ssh_tunnel
        echo -e "\nPress Enter to go back to menu..."
        read -r
        ;;
      x)
        break
        ;;
      *)
        echo "Invalid option. Please try again."
        ;;
    esac
  done
}

# Keep the script running until interrupt signal is received
while true; do

    clear
    # Display header
    show_header

    # show menu
    show_menu

    # Read user input
    read -n 1 option
    echo ""

    # Handle user input
    case $option in
        a)
            attach_to_screen
            ;;
        o)
            open_browser 3005
            ;;
        i)
            clear
            show_header
            show_access_info
            echo -e "\nPress Enter to continue..."
            read -r
            ;;
        r)
            restart_docker_watch
            ;;
        l)
            follow_docker_logs
            ;;
        e)
            inspect_inside_container
            ;;
        t)
            tunnelling_menu
            ;;
        x)
            clear
            show_header
            exit_script
            ;;
        *)
            echo "Invalid option. Please try again."
            ;;
    esac
done
