IMAGE_NAME := amazonlinux_23
CONTAINER_NAME := al23
AL23_USER := ec2-user

.PHONY: build-al23 run-al23 logs-al23 rm-al23 clean-al23 clean-dangling enable-ssh-forwarding playbook ssh-al23 test-ssh-ansible ansible-ping aws-playbook generate-ansible-keys copy-ssh-key-to-server create-ansible-inventory

build-al23:
	docker build -t $(IMAGE_NAME) .

run-al23: 
	docker-compose up -d 
	rm -rf ./ssh_keys/* 
	docker cp $(CONTAINER_NAME):/home/ec2-user/.ssh/personal_access ./ssh_keys/

logs-al23:
	docker logs -f $(CONTAINER_NAME) 

rm-al23:
	docker stop $(CONTAINER_NAME) && docker rm -f $(CONTAINER_NAME) 

clean-al23:
	docker rm -f $(CONTAINER_NAME)
	docker rmi -f $(IMAGE_NAME)

clean-dangling:
	docker images -q --filter "dangling=true" | xargs docker rmi -f

ssh-al23:
	ssh -i ./ssh_keys/personal_access $(AL23_USER)@$$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(CONTAINER_NAME))

test-ssh-ansible:
	ssh -i ./ssh_keys/ansible $(AL23_USER)@$$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(CONTAINER_NAME))

ansible-ping:
	nix-shell flake.nix --run "ansible all -m ping"

playbook:
	nix-shell flake.nix --run "ansible-playbook --ask-become-pass ./playbook.yml"

aws-playbook:
	nix-shell flake.nix --run "ansible-playbook --tags aws --ask-become-pass -vvv ./playbook.yml"

generate-ansible-keys:
	ssh-keygen -t ed25519 -f ./ssh_keys/ansible -C "ansible key" -N ""
	chmod 600 ./ssh_keys/ansible.pub
	chmod 600 ./ssh_keys/ansible

copy-ssh-key-to-server:
	scp -i ./ssh_keys/personal_access ./ssh_keys/ansible.pub $(AL23_USER)@$$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(CONTAINER_NAME)):/home/ec2-user/.ssh/authorized_keys

create-ansible-inventory:
	echo -e "[web_servers]\n$$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(CONTAINER_NAME)) ansible_user=$(AL23_USER)" > inventory

enable-ssh-forwarding:
	eval $$(ssh-agent) && ssh-add

.PHONY: help

help:
	@echo "Available targets:"
	@echo "  build-al23        : Build the Docker image $(IMAGE_NAME)."
	@echo "  run-al23          : Run the Docker container $(CONTAINER_NAME) and copy SSH keys."
	@echo "  logs-al23         : Display the logs of the Docker container $(CONTAINER_NAME)."
	@echo "  rm-al23           : Stop and remove the Docker container $(CONTAINER_NAME)."
	@echo "  clean-al23        : Remove the Docker container and image $(CONTAINER_NAME) and $(IMAGE_NAME)."
	@echo "  clean-dangling    : Remove dangling Docker images."
	@echo "  ssh-al23          : SSH into the Docker container $(CONTAINER_NAME) using personal_access key."
	@echo "  test-ssh-ansible  : Test SSH connection to the Docker container $(CONTAINER_NAME) using ansible key."
	@echo "  ansible-ping      : Run Ansible ping module on all hosts."
	@echo "  playbook          : Run the Ansible playbook.yml."
	@echo "  aws-playbook      : Run the Ansible playbook.yml with AWS-specific tags."
	@echo "  generate-ansible-keys : Generate Ansible SSH keys (ansible and ansible.pub)."
	@echo "  copy-ssh-key-to-server : Copy Ansible public key to the Docker container $(CONTAINER_NAME)."
	@echo "  create-ansible-inventory : Create an Ansible inventory file for the Docker container."
	@echo "  enable-ssh-forwarding  : Start SSH agent and add SSH key for forwarding."
