FROM debian:buster
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update
RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ buster-pgdg main" > /etc/apt/sources.list.d/pgdg.list
RUN apt-get -y install gnupg
RUN apt-get -y install curl
RUN apt-get -y install wget
RUN curl -sSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt-get update
RUN apt-get -y install postgresql-14
RUN curl -fsSL -o /usr/local/bin/dbmate https://github.com/amacneil/dbmate/releases/download/v1.16.0/dbmate-linux-amd64
RUN chmod +x /usr/local/bin/dbmate
WORKDIR /
RUN mkdir ./db
COPY ./db/ ./db/
ENV PATH /usr/lib/postgresql/14/bin:$PATH
ADD ./dbwait.sh /bin
RUN chmod +x /bin/dbwait.sh
