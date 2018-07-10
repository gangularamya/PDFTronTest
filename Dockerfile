FROM openjdk:8-jdk-slim-stretch

ARG INCLUDE_DEMO
ARG HTML_SUPPORT
ARG LIBRE_SUPPORT
ARG TOMCAT_SSL_CERT
ARG TOMCAT_SSL_KEY
ARG URL_PREFIX
ARG PDFNET_KEY
ARG DB_TYPE
ARG EXTERNAL_DB_LINK
ARG DEBUG_MODE
ARG BALANCER_COOKIE_NAME

ENV CATALINA_HOME /usr/local/apache-tomcat-9.0.6
ENV TRN_INTERNAL_DATA_DIR $CATALINA_HOME/internal_data
ENV TRN_DATA_STORAGE_DIR $CATALINA_HOME/static_data
ENV TRN_PDFNET_KEY $PDFNET_KEY
ENV TRN_DB_TYPE $DB_TYPE
ENV TRN_DB_LINK $EXTERNAL_DB_LINK
ENV TRN_BALANCER_COOKIE_NAME $BALANCER_COOKIE_NAME
ENV TRN_DEBUG_MODE_ENABLE true
ENV PATH $CATALINA_HOME/bin:$PATH

ENV TRN_LIBREOFFICE_BINARY libreoffice
# Installs Tomcat 9 and required libraries for APR
# - procps is for ps on the watchdog script
# - libtcnative is for the native APR libraries
# - ant builds the java files
COPY dockerpackages/* /install/


RUN cd install;\
    dpkg -i ant_1.9.9-1_all.deb;\
    dpkg -i libapr1_1.5.2-5_amd64.deb;\
    dpkg -i libtinfo5_6.0+20161126-1+deb9u2_amd64.deb;\
    dpkg -i libprocps6_3.3.12-3_amd64.deb;\
    dpkg -i libncurses5_6.0+20161126-1+deb9u2_amd64.deb;\
    dpkg -i procps_3.3.12-3_amd64.deb;\
    dpkg -i libtcnative-1_1.2.16-1_bpo9+1_amd64.deb;

RUN apt-get update;\
    if [ "${LIBRE_SUPPORT}" = "true" ]; then \
        apt-get install -y libreoffice --no-install-recommends; \
    fi;\
    if [ "${HTML_SUPPORT}" = "true" ]; then \
        apt-get install -y chromium --no-install-recommends; \
        ln -s /usr/bin/chromium /usr/bin/google-chrome;\
    fi;\
    apt-get autoremove -y; apt-get clean; rm -rf /var/lib/apt/lists;

# Copy files over
ADD apache-tomcat-9.0.6.tar.gz /usr/local/
COPY tomcat/ $CATALINA_HOME
COPY watchdog.sh $CATALINA_HOME/bin
COPY tomcat/bin/libPDFNetC.so /usr/lib/

# Cleanup and config
RUN if [ "${INCLUDE_DEMO}" = "false" ]; then \
        rm -rf $CATALINA_HOME/webapps/demo; \
    fi;\
    if [ "$TOMCAT_SSL_KEY" -a "$TOMCAT_SSL_CERT" ]; then \
        sed -i -e "s/cert.crt/$TOMCAT_SSL_CERT/g" $CATALINA_HOME/conf/server.xml;\
        sed -i -e "s/nopasskey.pem/$TOMCAT_SSL_KEY/g" $CATALINA_HOME/conf/server.xml;\
    fi

WORKDIR $CATALINA_HOME

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-server \
    && echo "root:Docker!" | chpasswd

COPY sshd_config /etc/ssh/


# Set user permissions for tomcat group 
RUN groupadd -r tomcat && useradd -m -g tomcat tomcat;\
    chown -R tomcat:tomcat .;\
    chmod +x /usr/lib/libPDFNetC.so;\
    chmod g+x bin/watchdog.sh;\
    chmod -R g+r conf;\
    chmod -R g+w logs temp webapps work;\
    chmod -R g+s conf logs temp webapps work;

USER tomcat

EXPOSE 2222 8090

ENTRYPOINT ["watchdog.sh"]
