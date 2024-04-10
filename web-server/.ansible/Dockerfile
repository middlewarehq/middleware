FROM amazonlinux:latest

RUN dnf install -y openssh-server vi python pip sudo curl tar --allowerasing 
RUN pip install supervisor

RUN useradd -m -d /home/ec2-user -s /bin/bash ec2-user
RUN echo 'root:password' | chpasswd
RUN echo 'ec2-user:password' | chpasswd

RUN usermod -aG wheel ec2-user

RUN ssh-keygen -A
RUN mkdir -p /home/ec2-user/.ssh \
    && chmod 700 /home/ec2-user/.ssh \
    && ssh-keygen -t ecdsa -f /home/ec2-user/.ssh/personal_access -N "" \
    && chmod 600 /home/ec2-user/.ssh/personal_access \
    && chown -R ec2-user: /home/ec2-user/.ssh

RUN echo -e '#!/bin/bash\n\nprivate_key_file=/home/ec2-user/.ssh/personal_access\n\nif [ -e "$private_key_file" ]; then\n    echo "Private key:"\n    cat "$private_key_file"\n\n\nfi' > /home/ec2-user/start.sh && \
    chmod +x /home/ec2-user/start.sh

RUN rm /etc/ssh/sshd_config
COPY ./al23_configs/sshd_config /etc/ssh/sshd_config
COPY ./al23_configs/supervisord.conf /etc/supervisord.conf

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
