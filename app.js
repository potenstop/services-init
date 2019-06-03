/**
 * Created by yanshaowen on 2018/10/9.
 */
'use strict';
const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();


app.use(require('koa-static')(__dirname + '/public'));
// logger
app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});
// wget http://192.168.133.1:3006/init.sh?hostname= -O init.sh
// wget http://192.168.199.101:3006/init.sh?hostname= -O init.sh
// ifconfig ens192 192.168.200.11 netmask 255.255.255.0
router.get('/init.sh', async (ctx, next) => {
    const hostname = ctx.query.hostname;
    const salveRe = /salve(\d+)$/;

    let netIp = '192.168.200.';


    let matchResult = hostname.match(salveRe);
    if (matchResult && matchResult.length === 2 && !isNaN(+matchResult[1])) {
        netIp += 10 + (+matchResult[1]);
    } else {
        netIp += '10';
    }
    ctx.body =
        `#!/bin/bash
changPasswd(){
  
  echo "root:123456" | sudo chpasswd
}
changeHostname(){
    sudo hostname ${hostname}
    sudo sed -i '1c ${hostname}' /etc/hostname
}
changeTimeZone(){
sudo tzselect << EOF
4
9
1
1
EOF
sudo cp /usr/share/zoneinfo/Asia/Shanghai  /etc/localtime
sudo sed -i '1c Asia/Shanghai' /etc/timezone
}
changeApt(){
  sudo rm -rf /etc/apt/sources.list
  sudo touch /etc/apt/sources.list
echo 'deb http://mirrors.aliyun.com/ubuntu/ bionic main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb-src http://mirrors.aliyun.com/ubuntu/ bionic main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb http://mirrors.aliyun.com/ubuntu/ bionic-security main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb-src http://mirrors.aliyun.com/ubuntu/ bionic-security main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb http://mirrors.aliyun.com/ubuntu/ bionic-updates main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb-src http://mirrors.aliyun.com/ubuntu/ bionic-updates main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb http://mirrors.aliyun.com/ubuntu/ bionic-backports main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb-src http://mirrors.aliyun.com/ubuntu/ bionic-backports main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb http://mirrors.aliyun.com/ubuntu/ bionic-proposed main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
echo 'deb-src http://mirrors.aliyun.com/ubuntu/ bionic-proposed main restricted universe multiverse' | sudo tee -a /etc/apt/sources.list
}
initNetwork(){
  sudo apt-get update
  sudo apt install ifupdown -y
  echo 'auto lo' | sudo tee -a /etc/network/interfaces
  echo 'iface lo inet loopback' | sudo tee -a /etc/network/interfaces
  
  echo 'auto ens192'| sudo tee -a /etc/network/interfaces
  echo 'iface ens192 inet static'| sudo tee -a /etc/network/interfaces
  echo 'address ${netIp}'| sudo tee -a /etc/network/interfaces
  echo 'netmask 255.255.255.0'| sudo tee -a /etc/network/interfaces
  # 不自动添加网关
  echo '#gateway 192.168.200.2'| sudo tee -a /etc/network/interfaces
  # 手动添加路由记录
  route add -net 192.168.200.0 netmask 255.255.255.0 dev ens192
  echo 'route add -net 192.168.200.0 netmask 255.255.255.0 dev ens192' |sudo tee -a /etc/rc.local

  systemctl restart networking.service
}
installShh(){
  sudo apt-get update
  sudo apt-get install -y openssh-server
  echo 'PermitRootLogin yes' | sudo tee -a /etc/ssh/sshd_config
  sudo service ssh restart
}
installTool(){
  sudo apt-get install -y gnupg vim  net-tools
}
echo "-----start-----"
echo '123456' | sudo -S ls
changPasswd
changeHostname
changeTimeZone
changeApt
initNetwork
installShh
installTool
echo "-----end-----"
  `;
});
// wget http://192.168.133.1:3006/k8s-master.sh -O k8s-master.sh
// wget http://192.168.199.101:3006/k8s-master.sh -O k8s-master.sh
router.get('/k8s-master.sh', async (ctx, next) => {
    const host = 'http://' + ctx.host + '/apt-key.gpg';
    ctx.body =
        `#!/bin/bash
initDocker(){
    sudo apt-get update && sudo apt-get install -y apt-transport-https
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
}
initKubernetes(){
    sudo apt-get install gnupg -y
    wget ${host} -O apt-key.gpg
    apt-key add apt-key.gpg 
    sudo echo "deb http://mirrors.ustc.edu.cn/kubernetes/apt kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list
    sudo apt-get update
    sudo apt-get install -y kubernetes-cni=0.6.0-00
    sudo apt-get install -y kubectl=1.11.3-00  kubeadm=1.11.3-00  kubelet=1.11.3-00
    swapoff -a
    sed -i '/swap/ s/^/#/' /etc/fstab 
}
downloadImages(){
    ### 版本信息
    K8S_VERSION=v1.11.3
    ETCD_VERSION=3.2.18
    COREDNS_VERSION=1.1.3
    PAUSE_VERSION=3.1
    ## 基本组件
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver-amd64:$K8S_VERSION
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager-amd64:$K8S_VERSION
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler-amd64:$K8S_VERSION
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy-amd64:$K8S_VERSION
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/etcd-amd64:$ETCD_VERSION
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/pause-amd64:$PAUSE_VERSION

    ### 网络
    docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/coredns:$COREDNS_VERSION
    
    ## 修改tag
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver-amd64:$K8S_VERSION k8s.gcr.io/kube-apiserver-amd64:$K8S_VERSION
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager-amd64:$K8S_VERSION k8s.gcr.io/kube-controller-manager-amd64:$K8S_VERSION
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler-amd64:$K8S_VERSION k8s.gcr.io/kube-scheduler-amd64:$K8S_VERSION
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy-amd64:$K8S_VERSION k8s.gcr.io/kube-proxy-amd64:$K8S_VERSION
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/etcd-amd64:$ETCD_VERSION k8s.gcr.io/etcd-amd64:$ETCD_VERSION
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/coredns:$COREDNS_VERSION k8s.gcr.io/coredns:$COREDNS_VERSION
    docker tag registry.cn-hangzhou.aliyuncs.com/google_containers/pause-amd64:$PAUSE_VERSION k8s.gcr.io/pause:$PAUSE_VERSION
    ## 删除镜像
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver-amd64:$K8S_VERSION
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager-amd64:$K8S_VERSION
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler-amd64:$K8S_VERSION
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy-amd64:$K8S_VERSION
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/etcd-amd64:$ETCD_VERSION
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/coredns:$COREDNS_VERSION
    docker rmi registry.cn-hangzhou.aliyuncs.com/google_containers/pause-amd64:$PAUSE_VERSION
  
}
kubeadmInit(){
    sleep 30
    kubeadm init --apiserver-advertise-address=192.168.200.10 --ignore-preflight-errors=all  --pod-network-cidr=10.244.0.0/16 --kubernetes-version=v1.11.3
    mkdir -p $HOME/.kube
    \\cp -f /etc/kubernetes/admin.conf $HOME/.kube/config
    chown $(id -u):$(id -g) $HOME/.kube/config
    kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
}
echo "-----start-----"
initDocker
initKubernetes
downloadImages
kubeadmInit
echo "-----end-----"
    `
});
// wget http://192.168.133.1:3006/k8s-slave.sh -O k8s-slave.sh
// wget http://192.168.199.101:3006/k8s-slave.sh -O k8s-slave.sh
router.get('/k8s-slave.sh', async (ctx, next) => {
    const host = 'http://' + ctx.host + '/apt-key.gpg';
    ctx.body =
        `#!/bin/bash
initDocker(){
    sudo apt-get update && sudo apt-get install -y apt-transport-https
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
}
initKubernetes(){
    sudo apt-get install gnupg -y
    wget ${host} -O apt-key.gpg
    apt-key add apt-key.gpg 
    sudo echo "deb http://mirrors.ustc.edu.cn/kubernetes/apt kubernetes-xenial main" > /etc/apt/sources.list.d/kubernetes.list
    sudo apt-get update
    sudo apt-get install -y kubernetes-cni=0.6.0-00
    sudo apt-get install -y kubectl=1.11.3-00  kubeadm=1.11.3-00  kubelet=1.11.3-00
    swapoff -a
    sed -i '/swap/ s/^/#/' /etc/fstab 
}
echo "-----start-----"
initDocker
initKubernetes
echo "-----end-----"
    `;
});
// wget http://192.168.133.1:3006/helm.sh -O helm.sh
// wget http://192.168.199.101:3006/helm.sh -O helm.sh
router.get('/helm.sh', async (ctx, next) => {
    const host = 'http://' + ctx.host;
    const helm =  "http://note.youdao.com/yws/public/resource/b58d28c992c7ca7bbedba7293a8645e3/xmlnote/8980D26EEF794B2DA709394BAC53F712/6554";
    const ingress =  host + '/ingress-nginx.yaml';
    const dashboard = host + '/kubernetes-dashboard.yaml';
    ctx.body =
        `#!/bin/bash
     installHelm(){
        wget ${helm} -O helm-v2.11.0-linux-amd64.tar.gz
        tar -zxf helm-v2.11.0-linux-amd64.tar.gz
        cp linux-amd64/helm /usr/local/bin/
        kubectl create serviceaccount --namespace kube-system tiller
        kubectl create clusterrolebinding tiller-cluster-rule --clusterrole=cluster-admin --serviceaccount=kube-system:tiller
        #helm init --upgrade -i registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.11.0 --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts --debug --tiller-tls --tiller-tls-cert ./tiller.cert.pem --tiller-tls-key ./tiller.key.pem --tiller-tls-verify --tls-ca-cert ca.cert.pem --tiller-connection-timeout 5000
        helm init --upgrade -i registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.11.0 --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts
        kubectl patch deploy --namespace kube-system tiller-deploy -p '{"spec":{"template":{"spec":{"serviceAccount":"tiller"}}}}'
     }
     nginxIngress(){
        sleep 120
        kubectl label node  k8s-dev-master node-role.kubernetes.io/edge=
        helm repo update
        
        kubectl taint nodes --all node-role.kubernetes.io/master-
        sleep 30
        helm install stable/nginx-ingress  --name nginx-ingress --namespace kube-system --set controller.hostNetwork=true,rbac.create=true        
     }
     InstallDashboard(){
        wget ${dashboard} -O kubernetes-dashboard.yaml
    
        helm install stable/kubernetes-dashboard --name dashboard --namespace kube-system  -f kubernetes-dashboard.yaml
     }
     
     installHelm
     nginxIngress
     InstallDashboard
    `;
});
// wget http://192.168.133.1:3006/helm-test.sh -O helm-test.sh
// wget http://192.168.199.101:3006/helm-test.sh -O helm-test.sh
router.get('/helm-test.sh', async (ctx, next) => {
    const host = 'http://' + ctx.host;
    ctx.body =
        `#!/bin/bash
        
    kubeadm reset
    kubeadm init --ignore-preflight-errors=all  --pod-network-cidr=10.244.0.0/16 --kubernetes-version=v1.11.3
    mkdir -p $HOME/.kube
    \\cp -f /etc/kubernetes/admin.conf $HOME/.kube/config
    chown $(id -u):$(id -g) $HOME/.kube/config
    kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
    sleep 120
    rm -rf /root/.helm/
    kubectl create serviceaccount --namespace kube-system tiller
    kubectl create clusterrolebinding tiller-cluster-rule --clusterrole=cluster-admin --serviceaccount=kube-system:tiller
    helm init --upgrade -i registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.11.0 --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts --tiller-connection-timeout 5000
    kubectl patch deploy --namespace kube-system tiller-deploy -p '{"spec":{"template":{"spec":{"serviceAccount":"tiller"}}}}'     
        `;

})
// wget http://192.168.133.1:3006/ldap.sh -O ldap.sh
// wget http://192.168.199.101:3006/ldap.sh -O ldap.sh
router.get('/ldap.sh', async (ctx, next) => {
    ctx.body =
        `#!/bin/bash
    PHP_VERSION=7.2
    apt-get install -y apache2 php php-ldap php-xml php-zip
    apt-get install -y slapd ldap-utils migrationtools
    #apt-get --purge remove -y slapd ldap-utils migrationtools

    mkdir /www
    cd /www 
    wget http://note.youdao.com/yws/public/resource/6e6b5d0367a0b2326619e29f5055cf88/xmlnote/B93E5271092C440AAE54C8000F5F60B3/6598 -O ldap-account-manager-6.5.tar.bz2
    tar jxf ldap-account-manager-6.5.tar.bz2
    rm -rf  ldap-account-manager-6.5.tar.bz2 
    mv ldap-account-manager-6.5 ldap-account-manager
    
    echo '<VirtualHost *:80>
    ServerName ldap.potens.top
    ServerAlias ldap.potens.top
    DocumentRoot /www/ldap-account-manager
    <Directory /www/ldap-account-manager>
        Options FollowSymLinks Includes
        AllowOverride All
        Order deny,allow
        Allow from all
    </Directory>
</VirtualHost>' > /etc/apache2/sites-available/ldap.potens.top.conf 
    ln -s /etc/apache2/sites-available/ldap.potens.top.conf  /etc/apache2/sites-enabled/ldap.potens.top.conf 
    
    sed -i '916i\\extension=xml' /etc/php/$PHP_VERSION/apache2/php.ini
    sed -i '917i\\extension=ldap' /etc/php/$PHP_VERSION/apache2/php.ini
    sed -i '918i\\extension=zip' /etc/php/$PHP_VERSION/apache2/php.ini
    
    cd /www/ldap-account-manager/config
    cp config.cfg.sample config.cfg
    cp unix.conf.sample unix.conf
    chown -R www-data:www-data /www
    /etc/init.d/apache2 restart
    
    
    
    `;
});
app.use(router.routes(), router.allowedMethods());

module.exports = app;