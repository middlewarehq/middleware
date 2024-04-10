echo "Setting aliases..."

alias gb='git branch'
alias gf='git fetch'
alias gs='git status'
# git current branch
alias gcb='gb | egrep -o "\* .+" | egrep -o "(\w|\d|-|_|\/)+"'
alias gp='git push'
# git down
alias gd='gf && git pull -r origin $(gcb)'
# git up
alias gu='gp origin $(gcb)'
# git up force
alias guf='gp origin +$(gcb)'
alias go='git checkout'
alias gc='git commit -am'
alias gcm='git commit -m'
alias gce='git commit'
# git commit with branch name as prefix
alias gcwb='function __f() { if [ -z "$1" ]; then echo "Missing commit message."; else git commit -am "$(gcb): $1"; fi; ret=$?; unset -f __f; return $ret; }; __f'
alias gcwbs='function __f() { if [ -z "$1" ]; then echo "Missing commit message."; else git commit -m "$(gcb): $1"; fi; ret=$?; unset -f __f; return $ret; }; __f'
alias gcs=gcwbs
# git last commit message
alias glcm='git show-branch --no-name HEAD'
alias gca='git commit --amend -am "$(glcm)"'
alias gcam='git commit --amend -m '
alias gcuf='read -p "Enter commit message: " commit_msg; gc "$commit_msg" && guf'
# git nuke/delete (branches based on regex)
alias gn='function __f() { if [ -z "$1" ]; then echo "Missing branch regex."; else gb -D $(gb --list "$1"); fi; ret=$?; unset -f __f; return $ret; }; __f'
alias gcauf='gca && guf'
alias gap='git add -p'
alias gri='git rebase -i'
alias grc='git rebase --continue'
alias gra='git rebase --abort'
alias gmc='git merge --continue'
alias gma='git merge --abort'
# git log (with merges)
alias glogm='git log --oneline --decorate --graph'
# git delete merged
alias gdelm='git branch --merged | egrep -v "(^\*|master|dev)" | xargs git branch -d'
alias gbranch='function __f() { gwip; gp -f origin $(gcb):$1; gunwip; ret=$?; unset -f __f; return $ret; }; __f'
alias gstage='gbranch staging'

# Git Config Aliases
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

# Misc Aliases (requires relevant commands to be available)
alias space='watch -n 1 "df -h | grep /dev/disk1"'
alias ram='watch -n 1 free -h'
alias reterm='source ~/.zshrc'
alias fire='watch -n 0.5 '\"'sensors | tail -n 6 | head -n 1 | awk '\''{print(\$1,\$2,\$3,\$4)}'\'' && sensors | tail -n 5 | head -n 4 | awk '\''{print(\$1,\$2,\$3)}'\'''\"''
alias port='function __f() { if [ -z "$1" ]; then echo "Missing port number."; else lsof -i :$1 | grep LISTEN | egrep -o "^\w+\ +\d+" | egrep -o "\d+"; fi; ret=$?; unset -f __f; return $ret; }; __f'
alias freeport='function __f() { if [ -z "$1" ]; then echo "Missing port number."; else kill -9 $(port ${1}); fi; ret=$?; unset -f __f; return $ret; }; __f'

alias ya='yarn add';
alias yad='ya -D';
alias yi='yarn install';
alias yr='yarn remove';
alias yga='yarn global add'
alias ygr='yarn global remove';
alias yat='function __f() { if [ -z "$1" ]; then echo "Missing package name."; else yarn add $1 && yarn add -D @types/$1; fi; ret=$?; unset -f __f; return $ret; }; __f'
alias yrt='function __f() { if [ -z "$1" ]; then echo "Missing package name."; else yarn remove $1 && yarn remove @types/$1; fi; ret=$?; unset -f __f; return $ret; }; __f'

alias dc='docker-compose';

# Alias overrides
alias glog='git log --oneline --decorate --graph --no-merges --date=relative --pretty="format:%C(auto,yellow)%h%C(auto,magenta)% G? %C(auto,blue)%>(8,trunc)%ad %C(auto,green)%<(10,trunc)%aN %C(auto,reset)%s%C(auto,red)% gD% D"'
alias python='python3'
alias pip='pip3'

alias are_aliases_ready='echo "Are aliases ready? Yes, they are!"'

echo "Aliases set!"