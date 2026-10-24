import { useState } from 'react';
import type { DockerContainer } from '../../api/client';
import { useContainersData } from './pageState/useContainersData';
import { useContainerFilters } from './pageState/useContainerFilters';
import { useContainerActions } from './pageState/useContainerActions';
import { useContainerDeployment } from './pageState/useContainerDeployment';

export interface UseContainersPageStateProps {
  initialAction?: string | null;
}

export function useContainersPageState({ initialAction }: UseContainersPageStateProps = {}) {
  const [selectedLogsContainer, setSelectedLogsContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedTerminalContainer, setSelectedTerminalContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedInspectContainer, setSelectedInspectContainer] = useState<DockerContainer | null>(null);
  const [editingTagsContainer, setEditingTagsContainer] = useState<DockerContainer | null>(null);
  const [sheetContainer, setSheetContainer] = useState<DockerContainer | null>(null);
  const [imageUpdateContainer, setImageUpdateContainer] = useState<{ id: string; name: string; image: string } | null>(null);
  const [composeConfigProject, setComposeConfigProject] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(initialAction === 'prune');

  const data = useContainersData();
  const filters = useContainerFilters(data.containers);
  const actions = useContainerActions({
    setContainers: data.setContainers,
    loadContainers: data.loadContainers,
    editingTagsContainer,
  });
  const deployment = useContainerDeployment();

  return {
    containers: data.containers,
    statsMap: data.statsMap,
    loading: data.loading,
    refreshing: data.refreshing,
    search: filters.search,
    setSearch: filters.setSearch,
    actionInProgress: actions.actionInProgress,
    selectedLogsContainer,
    setSelectedLogsContainer,
    selectedTerminalContainer,
    setSelectedTerminalContainer,
    selectedInspectContainer,
    setSelectedInspectContainer,
    editingTagsContainer,
    setEditingTagsContainer,
    sheetContainer,
    setSheetContainer,
    imageUpdateContainer,
    setImageUpdateContainer,
    composeConfigProject,
    setComposeConfigProject,
    selectedTag: filters.selectedTag,
    setSelectedTag: filters.setSelectedTag,
    selectedState: filters.selectedState,
    setSelectedState: filters.setSelectedState,
    showPruneModal,
    setShowPruneModal,
    viewMode: filters.viewMode,
    setViewMode: filters.setViewMode,
    deletingContainer: actions.deletingContainer,
    setDeletingContainer: actions.setDeletingContainer,
    deleteForce: actions.deleteForce,
    setDeleteForce: actions.setDeleteForce,
    deleteVolumes: actions.deleteVolumes,
    setDeleteVolumes: actions.setDeleteVolumes,
    isDeleting: actions.isDeleting,
    handleConfirmDelete: actions.handleConfirmDelete,
    loadContainers: data.loadContainers,
    handleAction: actions.handleAction,
    tagsWithCounts: filters.tagsWithCounts,
    filteredContainers: filters.filteredContainers,
    handleTagsUpdated: actions.handleTagsUpdated,
    activeDeployment: deployment.activeDeployment,
    setActiveDeployment: deployment.setActiveDeployment,
    isDeployModalOpen: deployment.isDeployModalOpen,
    setIsDeployModalOpen: deployment.setIsDeployModalOpen,
    webhookWizardContainer: deployment.webhookWizardContainer,
    setWebhookWizardContainer: deployment.setWebhookWizardContainer,
    handleTriggerDeploy: deployment.handleTriggerDeploy
  };
}
