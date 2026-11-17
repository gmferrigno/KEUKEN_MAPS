import { useEffect, useState } from "react";
import { motion } from "motion/react";
import moment from "moment";
import { PencilIcon, LocationExclamationIcon } from "@repo/icons";
import { useGeoreferenceEditRef, useMenuRef } from "../../../utils/hooks/map/useContextRef";
import { useAppSelector } from "../../../store/hooks";
import { canDo } from "../../../utils/permissions/georeference.permissions";
import type { IGeoreferenceTarget } from "../../../utils/types/georeference.types";

interface IProps {
  x: number;
  y: number;
  target: IGeoreferenceTarget;
  onShowRelation?: () => void;
  relationLabel?: string;
}

const ClientGeorefMenu = (props: IProps) => {
  const { CloseMenu } = useMenuRef();
  const { isEditing, target: editingTarget, handleStartEditing } = useGeoreferenceEditRef();
  const { profile } = useAppSelector((state) => state.user);
  const selectedDate = useAppSelector((state) => state.sidebar?.date);
  const canGeoreference = canDo(profile.permissions, "EDIT");
  const isDriverSource = props.target.source === "driverObserver";
  const selectedDay = moment(selectedDate);
  const isToday =
    selectedDay.isValid() &&
    selectedDay.format("YYYY-MM-DD") === moment().format("YYYY-MM-DD");
  const canGeoreferenceNow = canGeoreference && (!isDriverSource || isToday);
  const [leaveZone, setLeaveZone] = useState(false);

  const isEditingThis =
    isEditing &&
    editingTarget != null &&
    String(editingTarget.clientId) === String(props.target.clientId);

  const isEditingOther = isEditing && !isEditingThis;

  const onGeoreference = () => {
    handleStartEditing(props.target);
    CloseMenu();
  };

  const onRelation = () => {
    props.onShowRelation?.();
    CloseMenu();
  };

  const handleMouseLeave = () => {
    setLeaveZone(true);
  };

  const handleMouseEnter = () => {
    setLeaveZone(false);
  };

  useEffect(() => {
    if (leaveZone) {
      const t = window.setTimeout(() => {
        CloseMenu();
        setLeaveZone(false);
      }, 180);
      return () => window.clearTimeout(t);
    }
  }, [leaveZone, CloseMenu]);

  return (
    <div
      className="absolute z-[999] flex items-center p-7"
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        left: props.x,
        top: props.y,
        transform: "translate(-80%, -50%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative p-3 bg-primary-950/90 backdrop-blur-xl border border-main/10 rounded-dx shadow-2xl w-[220px] h-fit flex flex-col gap-y-2 items-center"
      >
        <h2 className="capitalize text-main font-bold text-sm truncate w-full text-center">
          {props.target.clientName}
        </h2>
        <p className="text-[10px] font-mono text-focus-300 -mt-1">#{props.target.clientId}</p>
        <hr className="border-0 bg-main/10 h-px w-full my-0.5" />

        <div className="w-full h-fit flex flex-col items-start gap-y-1.5">
          {props.onShowRelation && !isEditing && (
            <div
              className="w-full cursor-pointer px-2.5 py-1.5 flex justify-between items-center bg-primary-500/20 hover:bg-focus-500/30 border border-main/10 hover:border-focus-300/40 rounded-dx transition-colors duration-150 shadow-xs text-main/90 hover:text-main text-xs group"
              onClick={onRelation}
            >
              <p className="select-none">{props.relationLabel ?? "Ver relación"}</p>
            </div>
          )}

          {!isEditing && canGeoreferenceNow && (
            <div
              className="w-full cursor-pointer px-2.5 py-1.5 flex justify-between items-center bg-primary-500/20 hover:bg-focus-500/30 border border-main/10 hover:border-focus-300/40 rounded-dx transition-colors duration-150 shadow-xs text-main/90 hover:text-main text-xs group"
              onClick={onGeoreference}
            >
              <p className="select-none">Georeferenciar PDV</p>
              <PencilIcon className="stroke-main/80 group-hover:stroke-main size-3.5 transition-colors" />
            </div>
          )}

          {!isEditing && canGeoreference && isDriverSource && !isToday && (
            <p className="w-full px-2 py-1.5 text-[10px] text-main/50 text-center">
              Solo se puede georeferenciar el día actual
            </p>
          )}

          {!isEditing && !canGeoreference && !props.onShowRelation && (
            <p className="w-full px-2 py-1.5 text-[10px] text-main/50 text-center">
              Sin permiso para georeferenciar
            </p>
          )}

          {isEditingThis && (
            <div className="w-full p-2 bg-focus-500/20 border border-focus-300/40 rounded-dx flex justify-between items-center shadow-xs">
              <p className="text-focus-300 text-xs leading-tight font-semibold">
                Este PDV está en edición
              </p>
              <LocationExclamationIcon className="stroke-focus-300 size-4" />
            </div>
          )}

          {isEditingOther && (
            <div className="w-full p-2 bg-focus-500/20 border border-focus-300/40 rounded-dx flex justify-between items-center shadow-xs">
              <p className="text-focus-300 text-xs leading-tight font-semibold">
                Otro PDV en edición
              </p>
              <LocationExclamationIcon className="stroke-focus-300 size-4" />
            </div>
          )}
        </div>
      </motion.div>
      <div
        className="w-0 h-0
        border-t-[10px] border-t-transparent
        border-b-[10px] border-b-transparent
        border-l-[8px] border-l-primary-950/90"
      />
    </div>
  );
};

export default ClientGeorefMenu;
