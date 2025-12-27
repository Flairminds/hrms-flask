from flask import request, jsonify
from ..services.asset_service import AssetService

class AssetsController:
    """Controller for handling asset and inventory requests."""

    @staticmethod
    def get_pcs():
        """Lists all active computer systems in the inventory."""
        try:
            pcs = AssetService.get_all_pcs()
            return jsonify([{
                "PCID": p.PCID, "PCName": p.PCName, "Type": p.Type, 
                "PurchaseDate": p.PurchaseDate, "WarrantyTill": p.WarrantyTill
            } for p in pcs]), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def upsert_pc():
        """Creates or updates a PC record."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            pc_id = AssetService.upsert_pc(data)
            if pc_id:
                return jsonify({"Message": "PC information saved", "PCID": pc_id}), 200
            return jsonify({"Message": "Failed to save PC information"}), 500
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def assign_pc():
        """Assigns a hardware asset to an employee."""
        try:
            data = request.get_json()
            if not data or not data.get('EmployeeID') or not data.get('PCID'):
                return jsonify({"Message": "EmployeeID and PCID are required"}), 400
                
            assign_id = AssetService.assign_asset(data.get('EmployeeID'), data.get('PCID'))
            if assign_id:
                return jsonify({"Message": "PC assigned successfully", "AssignmentID": assign_id}), 201
            return jsonify({"Message": "Failed to assign PC"}), 500
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def get_maintenance():
        """Retrieves all maintenance records for physical assets."""
        try:
            records = AssetService.get_maintenance_records()
            return jsonify([dict(row.__dict__) for row in records if not row.__dict__.pop('_sa_instance_state', None)]), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500
