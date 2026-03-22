<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { checkForUpdate } from './utils/updater';

onLaunch(() => {
  console.log('JollyMusic App launched');
  checkForUpdate();
});
</script>

<style>
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background-color: #f5f5f7;
  color: #1d1d1f;
  height: 100%;
}

/* uni-app H5 tabBar styling override */
uni-tabbar .uni-tabbar {
  height: 110rpx !important;
}
uni-tabbar .uni-tabbar-bottom {
  height: 110rpx !important;
}
</style>
