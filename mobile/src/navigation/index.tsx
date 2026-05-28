import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";

import { DashboardScreen }   from "@/screens/DashboardScreen";
import { MapScreen }         from "@/screens/MapScreen";
import { AlertsScreen }      from "@/screens/AlertsScreen";
import { TrackerScreen }     from "@/screens/TrackerScreen";
import { TruckDetailScreen } from "@/screens/TruckDetailScreen";

export type RootStackParams = {
  Tabs:        undefined;
  TruckDetail: { truckId: string };
};

export type TabParams = {
  Dashboard: undefined;
  Map:       undefined;
  Alerts:    undefined;
  Tracker:   undefined;
};

const Tab   = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootStackParams>();

function tabIcon(name: keyof typeof Ionicons.glyphMap, focused: boolean, color: string) {
  const outlineName = `${name}-outline` as keyof typeof Ionicons.glyphMap;
  return <Ionicons name={focused ? name : outlineName} size={22} color={color} />;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle:            { backgroundColor: "#1F2937", borderTopColor: "#374151" },
        tabBarActiveTintColor:  "#F97316",
        tabBarInactiveTintColor:"#6B7280",
        headerStyle:            { backgroundColor: "#1F2937" },
        headerTintColor:        "#fff",
        headerShadowVisible:    false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ focused, color }) => tabIcon("speedometer", focused, color),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => supabase.auth.signOut()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          ),
        })}
      />

      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: ({ focused, color }) => tabIcon("map", focused, color) }}
      />

      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ tabBarIcon: ({ focused, color }) => tabIcon("warning", focused, color) }}
      />

      <Tab.Screen
        name="Tracker"
        component={TrackerScreen}
        options={{
          title: "Driver GPS",
          tabBarIcon: ({ focused, color }) => tabIcon("navigate", focused, color),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle:        { backgroundColor: "#1F2937" },
          headerTintColor:    "#fff",
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="TruckDetail"
          component={TruckDetailScreen}
          options={({ route }) => ({ title: "Truck Detail" })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
