import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { backupNow } from './backupV2';

export const BACKUP_TASK = 'debitmanager-background-backup';

TaskManager.defineTask(BACKUP_TASK, async () => {
  try {
    console.log('Running background backup task...');
    await backupNow();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('Background backup failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundBackup(intervalMinutes = 60) {
  console.log(`Registering background backup task with interval: ${intervalMinutes} minutes`);
  await BackgroundTask.registerTaskAsync(BACKUP_TASK, {
    minimumInterval: intervalMinutes * 60, // seconds
  });
}

export async function unregisterBackgroundBackup() {
  await BackgroundTask.unregisterTaskAsync(BACKUP_TASK);
}
