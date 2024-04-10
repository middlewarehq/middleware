FROM node:16.17.0

WORKDIR /usr/app

RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.1.3/zsh-in-docker.sh)" -- \
  -t robbyrussell \
  -p git -p 'history-substring-search' \
  -p https://github.com/zsh-users/zsh-autosuggestions \
  -p https://github.com/zsh-users/zsh-completions \
  -a 'bindkey "\$terminfo[kcuu1]" history-substring-search-up' \
  -a 'bindkey "\$terminfo[kcud1]" history-substring-search-down'


COPY . .

RUN bash -c "cat ./scripts/aliases.sh >> ~/.bashrc"
RUN bash -c "cat ./scripts/aliases.sh >> ~/.zshrc"

EXPOSE 3000