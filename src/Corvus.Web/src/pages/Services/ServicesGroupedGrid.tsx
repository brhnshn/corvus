import React from 'react';
import type { Service } from '../../api/client';
import { GroupSection } from '../../components/GroupSection';
import type { useEntityGrouping } from '../../utils/grouping';
import { ServiceCard } from './ServiceCard';

interface ServicesGroupedGridProps {
  grouping: ReturnType<typeof useEntityGrouping<Service>>;
  services: Service[];
  reordering: boolean;
  isAdmin: boolean;
  onMove: (currentIndex: number, direction: 'up' | 'down') => void;
  onDelete: (id: string, name: string) => void;
  onEdit: (service: Service) => void;
  onSelectTag: (tag: string) => void;
}

export const ServicesGroupedGrid: React.FC<ServicesGroupedGridProps> = ({
  grouping,
  services,
  reordering,
  isAdmin,
  onMove,
  onDelete,
  onEdit,
  onSelectTag
}) => {
  const {
    groups,
    collapsed,
    toggleCollapse,
    renameGroup,
    draggingId,
    dragOverGroup,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = grouping;

  return (
    <>
      {groups.map((group) => {
        if (group.items.length === 0) return null;

        return (
          <GroupSection
            key={group.name}
            title={group.name}
            count={group.items.length}
            isCollapsed={!!collapsed[group.name]}
            onToggleCollapse={() => toggleCollapse(group.name)}
            onRenameGroup={(newName) => renameGroup(group.name, newName)}
            isDragOver={dragOverGroup === group.name}
            onDragOver={(e) => handleDragOver(e, group.name)}
            onDragLeave={() => handleDragLeave(group.name)}
            onDrop={(e) => handleDrop(e, group.name)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {group.items.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  globalIndex={services.findIndex((s) => s.id === service.id)}
                  totalServices={services.length}
                  isDragging={draggingId === service.id}
                  reordering={reordering}
                  isAdmin={isAdmin}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onMove={onMove}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onSelectTag={onSelectTag}
                />
              ))}
            </div>
          </GroupSection>
        );
      })}
    </>
  );
};
