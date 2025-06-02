import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { queryFn, apiClient } from '@/lib/api';
import type { TodoWithDetails, HouseholdWithMembers } from '@shared/schema';

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [currentHouseholdId, setCurrentHouseholdId] = useState<number | null>(null);

  // Fetch user's households
  const { data: households } = useQuery<HouseholdWithMembers[]>({
    queryKey: ["/api/households"],
    queryFn,
  });

  const currentHousehold = households?.find(h => h.id === currentHouseholdId) || households?.[0];

  // Fetch todos
  const { data: todos, isLoading: todosLoading } = useQuery<TodoWithDetails[]>({
    queryKey: ["/api/todos", { householdId: currentHousehold?.id }],
    queryFn,
    enabled: !!currentHousehold,
  });

  // Toggle todo completion
  const toggleTodoMutation = useMutation({
    mutationFn: (todoId: number) => apiClient.patch(`/api/todos/${todoId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
  });

  const handleToggleTodo = (todoId: number) => {
    toggleTodoMutation.mutate(todoId);
  };

  const completedTodos = todos?.filter(todo => todo.completed) || [];
  const pendingTodos = todos?.filter(todo => !todo.completed) || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          {currentHousehold && (
            <Text style={styles.subtitle}>{currentHousehold.name}</Text>
          )}
        </View>

        {/* Pending Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="radio-button-unchecked" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Pending ({pendingTodos.length})</Text>
          </View>

          {pendingTodos.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="task-alt" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No pending tasks</Text>
            </View>
          ) : (
            pendingTodos.map(todo => (
              <TouchableOpacity
                key={todo.id}
                style={styles.taskCard}
                onPress={() => handleToggleTodo(todo.id)}
              >
                <View style={styles.taskContent}>
                  <MaterialIcons
                    name="radio-button-unchecked"
                    size={24}
                    color="#6b7280"
                    style={styles.taskIcon}
                  />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{todo.title}</Text>
                    {todo.description && (
                      <Text style={styles.taskDescription}>{todo.description}</Text>
                    )}
                    {todo.assignee && (
                      <Text style={styles.taskAssignee}>
                        Assigned to: {todo.assignee.firstName} {todo.assignee.lastName}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Completed Tasks */}
        {completedTodos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Completed ({completedTodos.length})</Text>
            </View>

            {completedTodos.map(todo => (
              <TouchableOpacity
                key={todo.id}
                style={[styles.taskCard, styles.completedTaskCard]}
                onPress={() => handleToggleTodo(todo.id)}
              >
                <View style={styles.taskContent}>
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#10b981"
                    style={styles.taskIcon}
                  />
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, styles.completedTaskTitle]}>
                      {todo.title}
                    </Text>
                    {todo.description && (
                      <Text style={[styles.taskDescription, styles.completedTaskDescription]}>
                        {todo.description}
                      </Text>
                    )}
                    {todo.assignee && (
                      <Text style={[styles.taskAssignee, styles.completedTaskAssignee]}>
                        Assigned to: {todo.assignee.firstName} {todo.assignee.lastName}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  taskCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  completedTaskCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#d1fae5',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  taskDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  completedTaskDescription: {
    color: '#9ca3af',
  },
  taskAssignee: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  completedTaskAssignee: {
    color: '#10b981',
  },
});