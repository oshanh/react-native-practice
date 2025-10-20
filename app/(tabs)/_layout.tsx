const BackupsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'cloud-sharp' : 'cloud-outline'} color={color} size={24} />
);
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

const HomeIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
);
const DebtorsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={24} />
);
const AboutIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} color={color} size={24} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f9cd3eff',
        headerStyle: {
      backgroundColor: '#25292e',
    },
    headerShadowVisible: false,
    headerTintColor: '#fff',
    tabBarStyle: {
      backgroundColor: '#25292e',
    },
      }}

    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: HomeIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="debtors"
        options={{
          title: 'Debtors',
          tabBarIcon: DebtorsIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="backups"
        options={{
          title: 'Backups',
          tabBarIcon: BackupsIcon,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: AboutIcon,
        }}
      />
      
    </Tabs>
  );
}
