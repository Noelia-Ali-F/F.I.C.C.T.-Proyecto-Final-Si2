"""
Predicción de lealtad / recompra con Random Forest (W15).
Usa features agregados del cliente; etiquetas débiles si hay pocos datos.
"""
from decimal import Decimal

from django.db.models import Max
from django.utils import timezone

try:
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
except ImportError:  # pragma: no cover
    np = None
    RandomForestClassifier = None


def _dias_desde_ultima_reserva(cliente):
    last = cliente.reservas.aggregate(m=Max('fecha_servicio'))['m']
    if not last:
        return 365
    return (timezone.now().date() - last).days


def ejecutar_prediccion_lealtad_todos():
    """
    Actualiza rf_probabilidad_retencion, rf_segmento_predicho, rf_ultima_prediccion
    para todos los clientes.
    """
    from .models import Cliente

    clientes = list(Cliente.objects.select_related('tipo_mudanza_preferido').all())
    if not clientes:
        return {'actualizados': 0, 'metodo': 'ninguno'}

    if np is None or RandomForestClassifier is None or len(clientes) < 4:
        return _heuristica_simple(clientes)

    X = []
    y = []
    ids = []
    for c in clientes:
        tipo_emp = 1.0 if c.tipo_cliente == 'empresarial' else 0.0
        dias = float(min(_dias_desde_ultima_reserva(c), 730))
        monto = float(c.monto_total_gastado or 0)
        n_mov = float(c.cantidad_mudanzas or 0)
        X.append([n_mov, monto, tipo_emp, dias])
        ids.append(c.pk)
        # Etiqueta débil: cliente "leal" si varias mudanzas o gasto alto
        y.append(1 if (c.cantidad_mudanzas or 0) >= 2 or monto >= 2000 else 0)

    X = np.array(X, dtype=float)
    y = np.array(y, dtype=int)

    if len(np.unique(y)) < 2:
        return _heuristica_simple(clientes)

    clf = RandomForestClassifier(
        n_estimators=80, max_depth=5, random_state=42, class_weight='balanced'
    )
    clf.fit(X, y)
    probas = clf.predict_proba(X)
    # índice de clase positiva (1)
    idx = list(clf.classes_).index(1) if 1 in clf.classes_ else probas.shape[1] - 1
    p1 = probas[:, idx]

    now = timezone.now()
    actualizados = 0
    for c, p in zip(clientes, p1):
        seg = 'alto' if p >= 0.6 else ('medio' if p >= 0.35 else 'bajo')
        Cliente.objects.filter(pk=c.pk).update(
            rf_probabilidad_retencion=Decimal(str(round(float(p), 4))),
            rf_segmento_predicho=seg,
            rf_ultima_prediccion=now,
        )
        actualizados += 1

    return {'actualizados': actualizados, 'metodo': 'random_forest'}


def _heuristica_simple(clientes):
    from .models import Cliente

    now = timezone.now()
    n = 0
    for c in clientes:
        monto = float(c.monto_total_gastado or 0)
        mov = c.cantidad_mudanzas or 0
        dias = _dias_desde_ultima_reserva(c)
        base = 0.15 + 0.12 * min(mov, 5) + min(monto / 15000, 0.35)
        decay = min(dias / 500, 0.25)
        p = max(0.05, min(0.98, base - decay))
        seg = 'alto' if p >= 0.55 else ('medio' if p >= 0.3 else 'bajo')
        Cliente.objects.filter(pk=c.pk).update(
            rf_probabilidad_retencion=Decimal(str(round(p, 4))),
            rf_segmento_predicho=seg,
            rf_ultima_prediccion=now,
        )
        n += 1
    return {'actualizados': n, 'metodo': 'heuristica'}
