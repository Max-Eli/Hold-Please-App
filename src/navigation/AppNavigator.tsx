import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ColorScheme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AgentsListScreen from '../screens/AgentsListScreen';
import CallLogsScreen from '../screens/CallLogsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateAgentScreen from '../screens/CreateAgentScreen';
import AgentDetailScreen from '../screens/AgentDetailScreen';
import CallDetailScreen from '../screens/CallDetailScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import LeadsScreen from '../screens/LeadsScreen';
import BusinessHoursScreen from '../screens/BusinessHoursScreen';
import AgentKnowledgeScreen from '../screens/AgentKnowledgeScreen';
import AppointmentSettingsScreen from '../screens/AppointmentSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500' as const,
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: string;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Agents') {
            iconName = focused ? 'mic' : 'mic-outline';
          } else if (route.name === 'Calls') {
            iconName = focused ? 'call' : 'call-outline';
          } else {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Agents" component={AgentsListScreen} options={{ tabBarLabel: 'Agent' }} />
      <Tab.Screen name="Calls" component={CallLogsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const loadingStyles = createLoadingStyles(colors);

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="CreateAgent"
              component={CreateAgentScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="AgentDetail" component={AgentDetailScreen} />
            <Stack.Screen name="CallDetail" component={CallDetailScreen} />
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="Leads" component={LeadsScreen} />
            <Stack.Screen name="BusinessHours" component={BusinessHoursScreen} />
            <Stack.Screen name="AgentKnowledge" component={AgentKnowledgeScreen} />
            <Stack.Screen name="AppointmentSettings" component={AppointmentSettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const createLoadingStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
